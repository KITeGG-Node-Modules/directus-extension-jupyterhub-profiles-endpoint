import { NO_GPU_SLUG } from './constants.js';

/**
 * Whether a single reservation row grants access to a profile. The `gpu`
 * column holds a single slug; `gpus` holds one or more slugs, either as an
 * array or as a string.
 */
export function reservationGrantsProfile(reservation, slug) {
	return (
		reservation?.gpu === slug ||
		(Array.isArray(reservation?.gpus) && reservation.gpus.includes(slug)) ||
		(Boolean(reservation?.gpus) && reservation.gpus.indexOf(slug) > -1)
	);
}

/**
 * Slugs of all profiles the user is allowed to choose from. The CPU-only
 * fallback profile is always eligible; reservations unlock the rest.
 */
export function resolveEligibleSlugs(profiles, reservations) {
	const eligible = new Set([NO_GPU_SLUG]);

	for (const reservation of reservations ?? []) {
		for (const profile of profiles) {
			if (reservationGrantsProfile(reservation, profile.slug)) {
				eligible.add(profile.slug);
			}
		}
	}

	return eligible;
}
