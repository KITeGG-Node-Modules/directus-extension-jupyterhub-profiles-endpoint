import { toStringArray } from './utils.js';

/**
 * All published jupyter images, ordered by their sort weight.
 */
export async function fetchPublishedImages(db) {
	return db('jupyter_images as ji')
		.select('ji.id', 'ji.sort', 'ji.display_name', 'ji.image', 'ji.groups', 'ji.kitegg_init_container')
		.where('ji.status', 'published')
		.orderBy('ji.sort', 'asc');
}

/**
 * Images the user may choose from: unrestricted images, images restricted to
 * a group the user belongs to, and everything for Directus admins.
 */
export function filterVisibleImages(images, userGroups, isAdmin = false) {
	return (images ?? []).filter((image) => {
		const groups = toStringArray(image.groups);
		if (isAdmin || groups.length === 0) {
			return true;
		}
		return groups.some((group) => userGroups.includes(group));
	});
}
