// SPDX-FileCopyrightText: 2024-2026 Mainz University of Applied Sciences
// SPDX-License-Identifier: EUPL-1.2
/**
 * Resolve a Keycloak subject (`sub` claim) to the linked Directus user.
 */
export async function findDirectusUser(db, externalIdentifier) {
	return db('directus_users')
		.select('id')
		.where('external_identifier', externalIdentifier)
		.first();
}
