// SPDX-FileCopyrightText: 2024-2026 Mainz University of Applied Sciences
// SPDX-License-Identifier: EUPL-1.2
import { authenticate } from './auth.js';
import { ApiError, sendError } from './errors.js';
import { fetchPublishedImages, filterVisibleImages } from './jupyterImages.js';
import { buildProfileList } from './profileList.js';
import { profiles } from './profiles.js';
import { fetchReservations } from './reservations.js';
import { findDirectusUser } from './users.js';
import { resolveEligibleSlugs } from './eligibility.js';

export default {
	id: 'jupyter',
	handler: (router, context) => {
		const logger = context.logger ?? console;
		const db = context.database;

		router.get('/profiles', async (req, res) => {
			// The response is personalized; never let intermediaries cache it.
			res.set('Cache-Control', 'no-store');

			try {
				const { sub, groups } = await authenticate(req.headers, logger);

				const user = await findDirectusUser(db, sub);
				if (!user) {
					throw new ApiError(403, 'UNKNOWN_USER', 'Authenticated identity is not linked to a Directus user');
				}

				let reservations;
				let images;
				try {
					// Reservations and images are independent; fetch them concurrently.
					[reservations, images] = await Promise.all([
						fetchReservations(db, user.id),
						fetchPublishedImages(db),
					]);
				} catch (error) {
					// Without this data the profile list would silently lose GPU
					// profiles or images; report the outage instead of hiding it.
					logger.error('Failed to fetch profile data:', error.message);
					throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Profile data is temporarily unavailable');
				}

				const eligibleSlugs = resolveEligibleSlugs(profiles, reservations);
				const visibleImages = filterVisibleImages(images, groups);

				res.json(buildProfileList(profiles, eligibleSlugs, visibleImages));
			} catch (error) {
				sendError(res, error, logger);
			}
		});
	},
};
