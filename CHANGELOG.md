# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-10-13

### Added

- Cryptographic verification of forwarded Keycloak access tokens against the
  realm's published signing keys (JWKS), with signature, `exp`, `nbf` and
  issuer enforcement and optional audience enforcement.
- New configuration via environment variables: `KEYCLOAK_ISSUER` or
  `KEYCLOAK_JWKS_URL` (required — the endpoint fails closed without them) and
  `KEYCLOAK_AUDIENCE` (optional).
- Structured JSON error responses (`{ "error": { "code", "message" } }`)
  with distinct codes for authentication, authorization, identity-provider
  and database failures.
- Unit tests for eligibility rules, list normalization, profile-list
  assembly and header parsing (`npm test`, built-in `node:test`).
- ESLint configuration and `npm run lint`; `.editorconfig`.
- README documenting the auth contract, configuration, eligibility rules,
  response/error formats and the expected data model.
- Committed `dist/` bundle so the extension can be installed directly from
  a git checkout without building.
- Licensing under the European Union Public Licence v1.2 (EUPL-1.2),
  © 2024–2026 Mainz University of Applied Sciences.

### Changed

- **Breaking:** access tokens are now verified; previously any
  base64-decodable string was trusted, so claims could be forged. Requests
  without a verifiable token are rejected with `401`, and the endpoint
  rejects *all* requests with `500 AUTH_NOT_CONFIGURED` until
  `KEYCLOAK_ISSUER` (or `KEYCLOAK_JWKS_URL`) is configured.
- **Breaking:** identities without a linked `directus_users` row now get
  `403 UNKNOWN_USER` (previously `401`).
- **Breaking:** image visibility is now decided solely by Keycloak group
  membership; the Directus admin bypass and the vestigial `no-gpu` group
  concatenation were removed.
- **Breaking:** the Directus host loads `dist/index.js` instead of
  `src/index.js`; deployments from a source checkout must run
  `npm run build` once.
- Database failures during profile assembly now return
  `503 SERVICE_UNAVAILABLE` instead of a silently degraded profile list
  containing only `no-gpu`.
- GPU reservations are matched by exact slug after normalizing the `gpus`
  value (JSON array, JSON-encoded string or comma-separated string);
  previously a string fallback used substring matching, which could grant
  unintended profiles.
- Reservation date windows are compared in UTC instead of the container's
  local timezone.
- Responses are sent with `Cache-Control: no-store` since they are
  personalized.
- `directus:extension.host` widened to `>=10.3.4` so Directus 11 hosts can
  install the extension.

### Fixed

- `npm run build` no longer overwrites the hand-written extension source
  (`directus:extension.path` pointed at `src/index.js`, which is the build
  output path).
- Tokens that decode but lack a usable `sub` claim no longer silently
  receive a valid 200 response with only the `no-gpu` profile; they are
  rejected.
- Database errors during the user lookup no longer surface as
  `401 Unauthorized`.
- Reservation and image queries run concurrently instead of sequentially,
  and select only the columns they need (no more `select('*')` on
  `directus_users`).

### Removed

- Dead modules `src/images.js`, `src/volumes.js` and `src/volumeMounts.js`
  (superseded by the `jupyter_images` collection and hub-side volume hooks).
- Unused `axios` dependency and `jwt-decode` (replaced by `jose`).
- The `private` package flag so the package can be installed directly from
  a git URL.

## [1.0.0] - 2024-03-20

### Added

- Initial release: a Directus endpoint extension serving per-user
  JupyterHub KubeSpawner profile lists at `GET /jupyter/profiles`, with
  GPU profile eligibility driven by `gpu_reservations` (directly or via
  courses) and per-image visibility driven by `jupyter_images` group lists.
