import { IMAGE_OPTION_DISPLAY_NAME, INIT_CONTAINER_COMMAND, INIT_CONTAINER_NAME } from './constants.js';

/**
 * Assemble the KubeSpawner profile list: every eligible profile offers the
 * visible images as its "image" option, merged with the profile's own
 * resource limits and environment.
 */
export function buildProfileList(profiles, eligibleSlugs, images) {
	const profileList = [];

	for (const profile of profiles) {
		if (!eligibleSlugs.has(profile.slug)) {
			continue;
		}

		const choices = {};
		for (const image of images) {
			const key = `${image.sort || 0}-${image.id}`;
			const kubespawnerOverride = {};

			if (profile.kubespawner_override?.environment) {
				kubespawnerOverride.environment = profile.kubespawner_override.environment;
			}
			if (profile.kubespawner_override?.extra_resource_limits) {
				kubespawnerOverride.extra_resource_limits = profile.kubespawner_override.extra_resource_limits;
			}
			if (image.image) {
				kubespawnerOverride.image = image.image;
			}
			if (image.kitegg_init_container) {
				// The init script ships with the kitegg images themselves, so the
				// selected image is reused as its own init container.
				kubespawnerOverride.init_containers = [{
					image: image.image,
					name: INIT_CONTAINER_NAME,
					command: INIT_CONTAINER_COMMAND,
				}];
			}

			choices[key] = {
				display_name: image.display_name,
				kubespawner_override: kubespawnerOverride,
			};
		}

		profileList.push({
			weight: profile.weight,
			display_name: profile.display_name,
			slug: profile.slug,
			default: Boolean(profile.default),
			profile_options: {
				image: {
					display_name: IMAGE_OPTION_DISPLAY_NAME,
					choices,
				},
			},
		});
	}

	return profileList;
}
