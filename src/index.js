import { jwtDecode } from 'jwt-decode'
import { profiles } from './profiles.js'
import { images } from './images.js'
import { DateTime } from 'luxon'

export default {
  id: 'jupyter',
  handler: (router, context) => {
    const {services, logger} = context
    const {UsersService} = services

    router.get('/profiles', async (req, res) => {
			if (!req.headers['x-authorization'] && !req.accountability?.user) {
				console.log('Keycloak: Anonymous rejected')
				res.status(401)
				return res.send({message: 'api_errors.unauthorized'})
			}

			const usersService = new UsersService({schema: req.schema, accountability: req.accountability})
			let userGroups, user
			if (req.headers['x-authorization']) {
				const token = req.headers['x-authorization'].split(' ').pop()
				try {
					const decodedToken = jwtDecode(token)
					// if (decodedToken.exp * 1000 < Date.now()) {
					// 	res.status(401)
					// 	return res.send({message: 'api_errors.unauthorized'})
					// }
					const { groups, sub: oidcId } = decodedToken
					if (Array.isArray(groups) && oidcId) {
						userGroups = groups.concat(['no-gpu'])
						const userResult = await usersService.knex('directus_users').select('*').where('external_identifier', oidcId)
						user = userResult.pop()
						if (!user) {
							console.error('Unknown Directus user')
							res.status(401)
							return res.send({message: 'api_errors.unknown_user'})
						}
					}
				} catch (err) {
					console.error('Failed to get user:', err.message)
					res.status(401)
					return res.send({message: 'api_errors.unauthorized'})
				}
			} else {
				res.status(401)
				return res.send({message: 'api_errors.unauthorized'})
			}

			let allowedProfiles = []
			const profileList = []

			const today = DateTime.now().toFormat('yyyy-MM-dd')
			try {
				const [profileReservation] = await usersService.knex('gpu_reservations as gr')
					.select('gr.gpu')
					.innerJoin('gpu_reservations_directus_users as grdu',
						'gr.id', '=', 'grdu.gpu_reservations_id')
					.where('grdu.directus_users_id', user.id)
					.andWhere('gr.start', '<=', today)
					.andWhere('gr.end', '>', today)
				const reservedProfile = profiles.find(profile => profile.slug === profileReservation?.gpu)
				allowedProfiles = profiles.filter(profile => profile.slug === 'no-gpu')
				if (reservedProfile) allowedProfiles.push(reservedProfile)
			} catch (err) {
				console.error('Failed to fetch reservations:', err.message)
			}

			for (const profile of allowedProfiles) {
				const choices = {}
				for (const image of images) {
					let mayUse = !image.groups
					if (!mayUse) {
						for (const group of image.groups) {
							mayUse = mayUse || userGroups.includes(group)
						}
					}
					if (!mayUse) continue
					const { key, display_name } = image
					choices[key] = {
						display_name,
						kubespawner_override: {}
					}
					if (profile.kubespawner_override?.environment) {
						choices[key].kubespawner_override.environment = profile.kubespawner_override.environment
					}
					if (profile.kubespawner_override?.extra_resource_limits) {
						choices[key].kubespawner_override.extra_resource_limits = profile.kubespawner_override.extra_resource_limits
					}
					if (profile.kubespawner_override?.image) {
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

      res.send(profileList)
    })
  }
}
