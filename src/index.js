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
			try {
				const { sub, groups } = await authenticate(req.headers, logger);

				const user = await findDirectusUser(db, sub);
				if (!user) {
					throw new ApiError(401, 'UNKNOWN_USER', 'Unknown Directus user');
				}

				// Reservations and images are independent; fetch them concurrently.
				let reservations = [];
				let images = [];
				try {
					[reservations, images] = await Promise.all([
						fetchReservations(db, user.id),
						fetchPublishedImages(db),
					]);
				} catch (error) {
					// Degrade to the CPU-only profile instead of failing the spawn.
					logger.error('Failed to fetch profile data:', error.message);
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
