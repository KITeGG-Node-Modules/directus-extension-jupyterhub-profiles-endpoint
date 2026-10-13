import { jwtDecode } from 'jwt-decode';
import { ApiError } from './errors.js';
import { NO_GPU_SLUG } from './constants.js';

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
 * Decode the access token and return the claims this endpoint relies on.
 * Tokens without a subject are rejected; tokens without a groups claim are
 * treated as group-less.
 */
export function authenticate(headers) {
	const token = extractAccessToken(headers);

	let payload;
	try {
		payload = jwtDecode(token);
	} catch {
		throw new ApiError(401, 'INVALID_TOKEN', 'Access token could not be decoded');
	}

	if (typeof payload.sub !== 'string' || payload.sub === '') {
		throw new ApiError(401, 'INVALID_TOKEN', 'Access token has no subject');
	}

	const groups = Array.isArray(payload.groups)
		? payload.groups.filter((group) => typeof group === 'string')
		: [];

	// Every user may fall back to the CPU-only profile.
	return { sub: payload.sub, groups: groups.concat([NO_GPU_SLUG]) };
}
