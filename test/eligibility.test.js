// SPDX-FileCopyrightText: 2024-2026 Mainz University of Applied Sciences
// SPDX-License-Identifier: EUPL-1.2
import test from 'node:test';
import assert from 'node:assert/strict';
import { profiles } from '../src/profiles.js';
import { reservationGrantsProfile, resolveEligibleSlugs } from '../src/eligibility.js';

test('no-gpu is always eligible', () => {
	const slugs = resolveEligibleSlugs(profiles, []);
	assert.ok(slugs.has('no-gpu'));
	assert.equal(slugs.size, 1);
});

test('a direct gpu reservation unlocks exactly that profile', () => {
	const slugs = resolveEligibleSlugs(profiles, [{ gpu: 'gpu-xs' }]);
	assert.ok(slugs.has('gpu-xs'));
	assert.ok(!slugs.has('gpu-s'));
	assert.ok(!slugs.has('gpu-l'));
});

test('array gpus unlock every listed profile exactly', () => {
	const slugs = resolveEligibleSlugs(profiles, [{ gpus: ['gpu-s', 'gpu-m'] }]);
	assert.ok(slugs.has('gpu-s'));
	assert.ok(slugs.has('gpu-m'));
	assert.ok(!slugs.has('gpu-xs'));
	assert.ok(!slugs.has('gpu-l'));
});

test('JSON-encoded gpus strings are matched exactly', () => {
	const slugs = resolveEligibleSlugs(profiles, [{ gpus: '["gpu-xs"]' }]);
	assert.ok(slugs.has('gpu-xs'));
	assert.ok(!slugs.has('gpu-s'), 'gpu-s must not be unlocked by a gpu-xs reservation');
});

test('comma-separated gpus strings are matched exactly', () => {
	const slugs = resolveEligibleSlugs(profiles, [{ gpus: 'gpu-l,gpu-xl' }]);
	assert.ok(slugs.has('gpu-l'));
	assert.ok(slugs.has('gpu-xl'));
	assert.ok(!slugs.has('gpu-s'));
});

test('unusable reservation rows grant nothing extra', () => {
	const slugs = resolveEligibleSlugs(profiles, [{ gpu: null, gpus: null }, {}, { gpus: 42 }, null]);
	assert.deepEqual([...slugs], ['no-gpu']);
});

test('reservationGrantsProfile is exact-match only', () => {
	assert.equal(reservationGrantsProfile({ gpu: 'gpu-xs' }, 'gpu-s'), false);
	assert.equal(reservationGrantsProfile({ gpus: 'gpu-xs' }, 'gpu-s'), false);
	assert.equal(reservationGrantsProfile({ gpus: ['gpu-s'] }, 'gpu-s'), true);
	assert.equal(reservationGrantsProfile(undefined, 'gpu-xs'), false);
});
