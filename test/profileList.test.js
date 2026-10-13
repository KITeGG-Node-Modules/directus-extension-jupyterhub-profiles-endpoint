// SPDX-FileCopyrightText: 2024-2026 Mainz University of Applied Sciences
// SPDX-License-Identifier: EUPL-1.2
import test from 'node:test';
import assert from 'node:assert/strict';
import { profiles } from '../src/profiles.js';
import { buildProfileList } from '../src/profileList.js';

const images = [
	{
		id: 'a1',
		sort: 0,
		display_name: 'Default Image',
		image: 'registry.example/default:1',
		groups: [],
		kitegg_init_container: 0,
	},
	{
		id: 'b2',
		sort: 10,
		display_name: 'Init Image',
		image: 'registry.example/init:1',
		groups: null,
		kitegg_init_container: 1,
	},
];

test('only eligible profiles are listed, with no-gpu first', () => {
	const list = buildProfileList(profiles, new Set(['no-gpu']), images);
	assert.equal(list.length, 1);
	assert.equal(list[0].slug, 'no-gpu');
	assert.equal(list[0].weight, 0);
	assert.equal(list[0].default, true);
});

test('kubespawner overrides merge profile limits with the image reference', () => {
	const list = buildProfileList(profiles, new Set(['gpu-xs']), images);
	const gpuXs = list.find((profile) => profile.slug === 'gpu-xs');
	const choice = Object.values(gpuXs.profile_options.image.choices)[0];

	assert.equal(choice.display_name, 'Default Image');
	assert.equal(choice.kubespawner_override.image, 'registry.example/default:1');
	assert.deepEqual(choice.kubespawner_override.extra_resource_limits, { 'nvidia.com/mig-1g.10gb': 1 });
	assert.deepEqual(choice.kubespawner_override.environment, { NVIDIA_DRIVER_CAPABILITIES: 'all' });
	assert.equal(choice.kubespawner_override.init_containers, undefined);
});

test('flagged images get an init container built from the selected image', () => {
	const list = buildProfileList(profiles, new Set(['no-gpu']), images);
	const initChoice = Object.values(list[0].profile_options.image.choices).at(-1);

	assert.deepEqual(initChoice.kubespawner_override.init_containers, [{
		image: 'registry.example/init:1',
		name: 'kitegg-init-container',
		command: ['/opt/kitegg-base-image/init-container.sh'],
	}]);
});

test('choice keys stay unique and stable across images', () => {
	const list = buildProfileList(profiles, new Set(['no-gpu']), images);
	const keys = Object.keys(list[0].profile_options.image.choices);
	assert.deepEqual(keys, ['0-a1', '10-b2']);
});

test('profiles without eligible slugs are skipped entirely', () => {
	const list = buildProfileList(profiles, new Set(['gpu-xl']), images);
	assert.equal(list.length, 1);
	assert.equal(list[0].slug, 'gpu-xl');
	assert.equal(Object.keys(list[0].profile_options.image.choices).length, 2);
});

test('an eligible profile without visible images gets empty choices', () => {
	const list = buildProfileList(profiles, new Set(['no-gpu']), []);
	assert.equal(list.length, 1);
	assert.deepEqual(list[0].profile_options.image.choices, {});
});
