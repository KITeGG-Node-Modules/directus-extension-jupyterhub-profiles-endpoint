// SPDX-FileCopyrightText: 2024-2026 Mainz University of Applied Sciences
// SPDX-License-Identifier: EUPL-1.2
/**
 * An error that maps directly to an HTTP response.
 */
export class ApiError extends Error {
	constructor(status, code, message) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
	}
}

/**
 * Convert an error into an HTTP response. ApiErrors are sent with their
 * intended status and a machine readable code; anything else is logged and
 * reported as a generic 500 so internals never leak to the client.
 */
export function sendError(res, error, logger) {
	if (error instanceof ApiError) {
		const log = `${error.status} ${error.code}: ${error.message}`;
		if (error.status >= 500) {
			logger.error(log);
		} else {
			logger.warn(log);
		}
		res.status(error.status).json({ error: { code: error.code, message: error.message } });
		return;
	}

	logger.error('Unhandled error while serving /jupyter/profiles:', error);
	res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
}
