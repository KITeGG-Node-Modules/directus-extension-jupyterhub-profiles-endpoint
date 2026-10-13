// SPDX-FileCopyrightText: 2024-2026 Mainz University of Applied Sciences
// SPDX-License-Identifier: EUPL-1.2
import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from 'jose';
import { ApiError } from './errors.js';

// The OIDC issuer of the Keycloak realm that issues the forwarded access
// tokens, e.g. `https://sso.example.com/realms/kitegg`.
const ISSUER = process.env.KEYCLOAK_ISSUER ?? '';
// Optional explicit JWKS URL; skips OIDC discovery when set.
const JWKS_URL = process.env.KEYCLOAK_JWKS_URL ?? '';
// Optional audience enforcement; many Keycloak setups leave `aud` unset.
const AUDIENCE = process.env.KEYCLOAK_AUDIENCE ?? '';

let jwksPromise;

/**
 * Resolve the realm's signing keys via OIDC discovery (unless a JWKS URL was
 * configured explicitly) and cache the result for the process lifetime. The
 * returned remote key set refreshes itself on unknown key ids.
 */
async function discoverJwks() {
	if (JWKS_URL) {
		return createRemoteJWKSet(new URL(JWKS_URL));
	}

	const metadataUrl = `${ISSUER.replace(/\/+$/, '')}/.well-known/openid-configuration`;
	const response = await fetch(metadataUrl, { signal: AbortSignal.timeout(10_000) });
	if (!response.ok) {
		throw new ApiError(503, 'AUTH_BACKEND_UNAVAILABLE', `OIDC discovery failed with HTTP ${response.status}`);
	}

	const metadata = await response.json();
	if (!metadata.jwks_uri) {
		throw new ApiError(500, 'AUTH_NOT_CONFIGURED', 'OIDC discovery document has no jwks_uri');
	}
	if (ISSUER && metadata.issuer !== ISSUER) {
		throw new ApiError(500, 'AUTH_NOT_CONFIGURED', 'OIDC discovery issuer mismatch');
	}

	return createRemoteJWKSet(new URL(metadata.jwks_uri));
}

function getJwks() {
	if (!jwksPromise) {
		jwksPromise = discoverJwks().catch((error) => {
			// Allow a retry on the next request instead of caching the failure.
			jwksPromise = null;
			throw error;
		});
	}
	return jwksPromise;
}

function assertConfigured(logger) {
	if (ISSUER || JWKS_URL) return;

	// Fail closed: without a trust anchor no token can be verified.
	logger.error('Keycloak authentication is not configured; all requests will be rejected. Set KEYCLOAK_ISSUER or KEYCLOAK_JWKS_URL.');
	throw new ApiError(500, 'AUTH_NOT_CONFIGURED', 'Authentication backend is not configured');
}

/**
 * Errors that mean "the identity provider could not be reached", as opposed
 * to "the token is invalid". jose signals timeouts via JWKSTimeout, HTTP and
 * parse problems via plain JOSEErrors about the key set, and network failures
 * propagate as TypeErrors or system errors with an errno code.
 */
function isAuthBackendUnavailable(error) {
	if (error instanceof joseErrors.JWKSTimeout) return true;
	if (error instanceof TypeError) return true;
	if (typeof error?.code === 'string' && /^(ECONN|EHOSTUNREACH|ENETUNREACH|ENOTFOUND|EAI_AGAIN|ETIMEDOUT)/.test(error.code)) {
		return true;
	}
	return error instanceof joseErrors.JOSEError && error.message.includes('JSON Web Key Set');
}

/**
 * Extract the raw access token from the request headers. Accepts
 * `Bearer <token>` and, for backwards compatibility, a bare token.
 */
export function extractAccessToken(headers) {
	const header = headers?.['x-authorization'];
	if (typeof header !== 'string' || header.trim() === '') {
		throw new ApiError(401, 'UNAUTHORIZED', 'Missing X-Authorization header');
	}

	const parts = header.trim().split(/\s+/);
	if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
		return parts[1];
	}
	if (parts.length === 1) {
		return parts[0];
	}
	throw new ApiError(401, 'UNAUTHORIZED', 'Malformed X-Authorization header');
}

/**
 * Verify the forwarded access token against Keycloak's signing keys and
 * return the claims this endpoint relies on: the subject and the group
 * memberships. Signature, expiry, nbf and (when configured) issuer and
 * audience are all enforced; anything unverifiable is rejected.
 */
export async function authenticate(headers, logger) {
	assertConfigured(logger);
	const token = extractAccessToken(headers);

	let payload;
	try {
		const verifyOptions = {};
		if (ISSUER) verifyOptions.issuer = ISSUER;
		if (AUDIENCE) verifyOptions.audience = AUDIENCE;

		({ payload } = await jwtVerify(token, await getJwks(), verifyOptions));
	} catch (error) {
		if (error instanceof ApiError) throw error;
		if (isAuthBackendUnavailable(error)) {
			logger.warn('Keycloak is unreachable while verifying a token:', error.message);
			throw new ApiError(503, 'AUTH_BACKEND_UNAVAILABLE', 'Identity provider is unreachable');
		}
		throw new ApiError(401, 'INVALID_TOKEN', 'Access token is invalid or expired');
	}

	if (typeof payload.sub !== 'string' || payload.sub === '') {
		throw new ApiError(401, 'INVALID_TOKEN', 'Access token has no subject');
	}

	const groups = Array.isArray(payload.groups)
		? payload.groups.filter((group) => typeof group === 'string')
		: [];

	return { sub: payload.sub, groups };
}
