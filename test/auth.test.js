// SPDX-FileCopyrightText: 2024-2026 Mainz University of Applied Sciences
// SPDX-License-Identifier: EUPL-1.2
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAccessToken } from '../src/auth.js';
import { ApiError } from '../src/errors.js';

test('extracts a Bearer token', () => {
	assert.equal(extractAccessToken({ 'x-authorization': 'Bearer abc.def.ghi' }), 'abc.def.ghi');
});

test('extracts a token with a case-insensitive Bearer scheme', () => {
	assert.equal(extractAccessToken({ 'x-authorization': 'bearer abc.def.ghi' }), 'abc.def.ghi');
});

test('tolerates a bare token for backwards compatibility', () => {
	assert.equal(extractAccessToken({ 'x-authorization': 'abc.def.ghi' }), 'abc.def.ghi');
});

test('rejects missing, empty and malformed headers with 401', () => {
	for (const headers of [{}, { 'x-authorization': '' }, { 'x-authorization': '   ' }]) {
		assert.throws(() => extractAccessToken(headers), ApiError);
	}

	try {
		extractAccessToken({});
	} catch (error) {
		assert.equal(error.status, 401);
		assert.equal(error.code, 'UNAUTHORIZED');
	}
});

test('rejects multi-part header values', () => {
	assert.throws(() => extractAccessToken({ 'x-authorization': 'Basic abc def' }), ApiError);
});
