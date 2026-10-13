import { NO_GPU_SLUG } from './constants.js';
import { toStringArray } from './utils.js';

/**
 * Whether a single reservation row grants access to a profile. The `gpu`
 * column holds a single slug; `gpus` holds one or more slugs as an array,
 * a JSON-encoded array or a comma-separated string. Matching is exact:
 * substring accidents like a `gpu-s` slug inside a `gpu-xs` reservation
 * must never unlock a profile.
 */
export function reservationGrantsProfile(reservation, slug) {
	if (reservation?.gpu === slug) {
		return true;
	}
	return toStringArray(reservation?.gpus).includes(slug);
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
