import test from 'node:test';
import assert from 'node:assert/strict';
import { toStringArray } from '../src/utils.js';

test('toStringArray passes arrays through, dropping non-strings', () => {
	assert.deepEqual(toStringArray(['gpu-s', 5, null, 'gpu-m']), ['gpu-s', 'gpu-m']);
});

test('toStringArray parses JSON-encoded arrays', () => {
	assert.deepEqual(toStringArray('["gpu-xs","gpu-s"]'), ['gpu-xs', 'gpu-s']);
});

test('toStringArray splits comma-separated strings', () => {
	assert.deepEqual(toStringArray(' gpu-s , gpu-m '), ['gpu-s', 'gpu-m']);
});

test('toStringArray treats a single value as a one-element list', () => {
	assert.deepEqual(toStringArray('gpu-l'), ['gpu-l']);
});

test('toStringArray returns empty results for empty-ish input', () => {
	assert.deepEqual(toStringArray(null), []);
	assert.deepEqual(toStringArray(undefined), []);
	assert.deepEqual(toStringArray(''), []);
	assert.deepEqual(toStringArray('   '), []);
	assert.deepEqual(toStringArray({}), []);
	assert.deepEqual(toStringArray(42), []);
	assert.deepEqual(toStringArray(true), []);
});

test('toStringArray tolerates invalid JSON without throwing', () => {
	assert.deepEqual(toStringArray('["gpu-s'), ['["gpu-s']);
});
