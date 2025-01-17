import { jwtDecode } from 'jwt-decode'
import { profiles } from './profiles.js'
import { DateTime } from 'luxon'

export default {
  id: 'jupyter',
  handler: (router, context) => {
    const {services} = context
    const {UsersService, ItemsService} = services

    router.get('/profiles', async (req, res) => {
			if (!req.headers['x-authorization'] && !req.accountability?.user) {
				console.log('Keycloak: Anonymous rejected')
				res.status(401)
				return res.send({message: 'api_errors.unauthorized'})
			}

			const usersService = new UsersService({schema: req.schema, accountability: req.accountability})
			const jupyterImagesService = new ItemsService('jupyter_images', {schema: req.schema, accountability: req.accountability})
			let userGroups = [], user
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

			const allowedProfiles = profiles.filter(profile => profile.slug === 'no-gpu')
			const profileList = []

			const today = DateTime.now().toFormat('yyyy-MM-dd')
			try {
				// FIXME: Optimise this SQL crap
				const reservationsUser = await usersService.knex('gpu_reservations as gr')
					.select('gr.gpu,gr.gpus')
					.innerJoin('gpu_reservations_directus_users as grdu',
						'gr.id', '=', 'grdu.gpu_reservations_id')
					.where('grdu.directus_users_id', user.id)
					.andWhere('gr.start', '<=', today)
					.andWhere('gr.end', '>=', today)

				const courseIdsCollaborators = await usersService.knex('courses as c')
					.select('c.id')
					.innerJoin('courses_directus_users as cdu', 'c.id', '=', 'cdu.courses_id')
					.where('cdu.directus_users_id', user.id)
				const courseIdsMembers = await usersService.knex('courses as c')
					.select('c.id')
					.innerJoin('courses_directus_users_2 as cdu', 'c.id', '=', 'cdu.courses_id')
					.where('cdu.directus_users_id', user.id)
				const reservationsCourses = await usersService.knex('gpu_reservations as gr')
					.select('gr.gpu,gr.gpus')
					.whereIn('gr.course', courseIdsCollaborators.concat(courseIdsMembers).map(e => e.id))
					.andWhere('gr.start', '<=', today)
					.andWhere('gr.end', '>=', today)

				for (const profileReservation of reservationsUser.concat(reservationsCourses)) {
					const reservedProfile = profiles.find(profile => {
						return profile.slug === profileReservation?.gpu ||
							Array.isArray(profileReservation?.gpus) && profileReservation.gpus.includes(profile.slug)
					})
					if (reservedProfile) {
						if (!allowedProfiles.find(p => p.slug === reservedProfile.slug)) {
							allowedProfiles.push(reservedProfile)
						}
					}
				}
			} catch (err) {
				console.error('Failed to fetch reservations:', err.message)
			}

			let jupyterImages = []
			try {
				jupyterImages = await jupyterImagesService.knex('jupyter_images as ji')
					.where('status', 'published')
					.orderBy('sort', 'asc')
			} catch (err) {
				console.error('Failed to fetch images:', err.message)
			}

			for (const profile of allowedProfiles) {
				const choices = {}
				for (const jupyterImage of jupyterImages) {
					let mayUse = req.accountability?.admin || !jupyterImage.groups || !jupyterImage.groups.length
					if (!mayUse) {
						for (const group of jupyterImage.groups) {
							mayUse = mayUse || userGroups.includes(group)
						}
					}
					if (!mayUse) continue
					const { id, sort, display_name, image, kitegg_init_container } = jupyterImage
					const key = `${sort || 0}-${id}`
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
					if (image) {
						choices[key].kubespawner_override.image = image
					}
					if (kitegg_init_container) {
						if (!Array.isArray(choices[key].kubespawner_override.init_containers)) {
							choices[key].kubespawner_override.init_containers = []
						}
						choices[key].kubespawner_override.init_containers.push({
							image,
							name: 'kitegg-init-container',
							command: ['/opt/kitegg-base-image/init-container.sh']
						})
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
