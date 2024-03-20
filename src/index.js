import { volumes } from './volumes.js'
import { volumeMounts } from './volumeMounts.js'
import { profiles } from './profiles.js'
import { images } from './images.js'

export default {
  id: 'jupyter',
  handler: (router, context) => {
    const {services, logger} = context
    const {ItemsService, UsersService} = services

    router.get('/profiles', (req, res) => {
			const sharedReadOnly = true

			const profileList = []

			for (const profile of profiles) {
				const choices = {}
				for (const image of images) {
					const { key, display_name } = image
					choices[key] = {
						display_name,
						kubespawner_override: {}
					}
					if (profile.kubespawner_override.environment) {
						choices[key].kubespawner_override.environment = profile.kubespawner_override.environment
					}
					if (profile.kubespawner_override.extra_resource_limits) {
						choices[key].kubespawner_override.extra_resource_limits = profile.kubespawner_override.extra_resource_limits
					}
					if (profile.kubespawner_override.image) {
						choices[key].kubespawner_override.image = image.kubespawner_override.image
					}
				}

				profileList.push({
					weight: profile['weight'],
					display_name: profile.display_name,
					slug: profile.slug,
					default: !!profile.default,
					profile_options: {
						image: {
							display_name: 'Image',
							choices
						}
					}
				})
			}

      res.send({
				volumes,
				volume_mounts: volumeMounts,
				profiles: profileList
			})
    })
  }
}
