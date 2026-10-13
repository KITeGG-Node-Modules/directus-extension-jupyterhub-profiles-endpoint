# JupyterHub Profiles Endpoint (Directus Extension)

A [Directus](https://directus.io) endpoint extension that serves per-user
[JupyterHub KubeSpawner](https://jupyterhub-kubespawner.readthedocs.io/) profile
lists at `GET /jupyter/profiles`.

JupyterHub calls this endpoint whenever a user spawns (or revisits) a server.
The response decides which compute profiles ("No GPU", "XS - 1G A100 10GB", …)
and which container images a user may choose from.

## How authorization works

1. JupyterHub forwards the user's Keycloak access token with every request:

   ```
   X-Authorization: Bearer <access-token>
   ```

   (a bare token without the `Bearer` prefix is tolerated for backwards
   compatibility).

2. The extension **verifies** the token against the Keycloak realm's published
   signing keys (JWKS). Signature, `exp`/`nbf` and the `iss` claim are always
   enforced; the `aud` claim is enforced when `KEYCLOAK_AUDIENCE` is set.
   Unverifiable tokens are rejected with `401`.

3. The `sub` claim is mapped to `directus_users.external_identifier`. Verified
   identities without a linked Directus account are rejected with `403`.

4. Eligible profiles:

   - the CPU-only `no-gpu` profile is always eligible;
   - a GPU profile is unlocked when a `gpu_reservations` row covering today
     (UTC) references the user directly, or one of the user's courses (via the
     `courses_directus_users` / `courses_directus_users_2` junction tables),
     and matches the profile slug through its `gpu` column or its `gpus` list
     (JSON array, JSON-encoded array string or comma-separated string — always
     matched exactly, never by substring).

5. Visible images: rows of the `jupyter_images` collection with
   `status = 'published'`, ordered by `sort`. An image is visible when its
   `groups` list is empty **or** contains at least one of the user's token
   `groups` claims. Directus roles and permissions are intentionally not
   involved — the request is authenticated by the Keycloak token only.

Responses are sent with `Cache-Control: no-store`; they are personalized.

## Configuration (environment variables)

| Variable             | Required | Description                                                                     |
| -------------------- | -------- | ------------------------------------------------------------------------------- |
| `KEYCLOAK_ISSUER`    | yes*     | Full issuer URL of the realm, e.g. `https://sso.example.com/realms/kitegg`.     |
| `KEYCLOAK_JWKS_URL`  | no       | Explicit JWKS URL; skips OIDC discovery when set.                               |
| `KEYCLOAK_AUDIENCE`  | no       | Enforce the token `aud` claim when set.                                         |

\* Either `KEYCLOAK_ISSUER` or `KEYCLOAK_JWKS_URL` must be configured. Without
a trust anchor no token can be verified, so the endpoint fails closed and
rejects every request with `500 AUTH_NOT_CONFIGURED`.

## Response format

```json
[
  {
    "weight": 0,
    "display_name": "No GPU",
    "slug": "no-gpu",
    "default": true,
    "profile_options": {
      "image": {
        "display_name": "Image",
        "choices": {
          "10-42": {
            "display_name": "KITeGG Base Image (Cuda 12.1)",
            "kubespawner_override": {
              "image": "registry.kitegg.de/library/kitegg-base-image:v1.0-cuda-12.1.0-runtime-ubuntu22.04"
            }
          }
        }
      }
    }
  }
]
```

For images flagged with `kitegg_init_container`, the selected image is reused
as its own Kubernetes init container (named `kitegg-init-container`, running
`/opt/kitegg-base-image/init-container.sh`), because the init script ships with
the kitegg images themselves.

## Error responses

Errors are returned as `{ "error": { "code": "...", "message": "..." } }`.

| Status | Code                     | Meaning                                                       |
| ------ | ------------------------ | ------------------------------------------------------------- |
| 401    | `UNAUTHORIZED`           | Missing or malformed `X-Authorization` header.                 |
| 401    | `INVALID_TOKEN`          | Token failed signature, expiry, issuer/audience or claim checks. |
| 403    | `UNKNOWN_USER`           | Verified identity has no linked `directus_users` row.          |
| 500    | `AUTH_NOT_CONFIGURED`    | `KEYCLOAK_ISSUER`/`KEYCLOAK_JWKS_URL` missing, or discovery is inconsistent. |
| 500    | `INTERNAL_SERVER_ERROR`  | Unexpected failure.                                            |
| 503    | `AUTH_BACKEND_UNAVAILABLE` | Keycloak (discovery or JWKS endpoint) is unreachable.        |
| 503    | `SERVICE_UNAVAILABLE`    | Database queries for reservations or images failed.            |

## Data contract

- `jupyter_images`: `status`, `sort`, `display_name`, `image`, `groups`
  (list of Keycloak group names; may be stored as a JSON array or a
  comma-separated string), `kitegg_init_container` (truthy flag).
- `gpu_reservations`: `gpu` (single slug), `gpus` (one or more slugs), `start`,
  `end`, `course`.
- `directus_users.external_identifier` holds the Keycloak `sub` claim.
- Static profile definitions (names, weights, resource limits, environments)
  live in `src/profiles.js`.

## Development

```bash
npm install
npm run build   # bundle to dist/ (the host loads dist/index.js)
npm run dev     # watch mode
npm test        # unit tests (node:test, no extra dependencies)
npm run lint    # eslint
```

The built `dist/` folder is committed, so the extension can be installed
directly from this repository without building. When `src/` changes, rebuild
and commit the updated `dist/` with it.

Note: switching from `path: src/index.js` to `path: dist/index.js` means the
host now loads the bundle; make sure `npm run build` runs once after installing
dependencies when deploying from a source checkout.
