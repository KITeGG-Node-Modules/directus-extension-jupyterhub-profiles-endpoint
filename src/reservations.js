import { DateTime } from 'luxon';

/**
 * The date (YYYY-MM-DD) reservations are compared against, always in UTC so
 * reservation windows do not shift with the container's timezone.
 */
export function currentReservationDate() {
	return DateTime.utc().toFormat('yyyy-MM-dd');
}

async function fetchUserReservations(db, userId, today) {
	return db('gpu_reservations as gr')
		.select('gr.gpu', 'gr.gpus')
		.innerJoin('gpu_reservations_directus_users as grdu', 'gr.id', '=', 'grdu.gpu_reservations_id')
		.where('grdu.directus_users_id', userId)
		.andWhere('gr.start', '<=', today)
		.andWhere('gr.end', '>=', today);
}

/**
 * Collect ids of all courses the user is a collaborator or member of. The
 * course collection has two junction tables for the two relations.
 */
async function fetchCourseIds(db, userId) {
	const [collaborators, members] = await Promise.all([
		db('courses as c')
			.select('c.id')
			.innerJoin('courses_directus_users as cdu', 'c.id', '=', 'cdu.courses_id')
			.where('cdu.directus_users_id', userId),
		db('courses as c')
			.select('c.id')
			.innerJoin('courses_directus_users_2 as cdu2', 'c.id', '=', 'cdu2.courses_id')
			.where('cdu2.directus_users_id', userId),
	]);

	const ids = new Set();
	for (const row of collaborators.concat(members)) {
		if (row.id != null) ids.add(row.id);
	}
	return [...ids];
}

async function fetchCourseReservations(db, courseIds, today) {
	return db('gpu_reservations as gr')
		.select('gr.gpu', 'gr.gpus')
		.whereIn('gr.course', courseIds)
		.andWhere('gr.start', '<=', today)
		.andWhere('gr.end', '>=', today);
}

/**
 * All GPU reservations that are active today and relevant to the user,
 * either directly or through one of their courses.
 */
export async function fetchReservations(db, userId) {
	const today = currentReservationDate();

	const [userReservations, courseIds] = await Promise.all([
		fetchUserReservations(db, userId, today),
		fetchCourseIds(db, userId),
	]);

	const courseReservations = courseIds.length > 0
		? await fetchCourseReservations(db, courseIds, today)
		: [];

	return userReservations.concat(courseReservations);
}
