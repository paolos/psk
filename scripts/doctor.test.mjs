import { test } from 'node:test';
import assert from 'node:assert/strict';

import { skillVerdict } from './doctor.mjs';

const plugin = { origin: 'plugin', detail: 'every machine must install the "x" plugin' };
const userSkill = { origin: 'user', detail: 'this machine only' };
const projectSkill = { origin: 'project', detail: 'travels with the repository' };
const missing = { origin: 'missing', detail: 'the "x" plugin is not installed on this machine' };
const unplaced = { origin: 'unplaced', detail: 'built-in or not installed' };

test('a plugin skill in the user layer does not concern teammates', () => {
  const v = skillVerdict(plugin, 'user', false);
  assert.equal(v.status, 'pass');
  assert.match(v.note, /teammates unaffected/);
});

test('a plugin skill in the local layer does not concern teammates', () => {
  assert.equal(skillVerdict(plugin, 'local', true).status, 'pass');
});

test('a plugin skill the project asks for warns: every teammate needs the plugin', () => {
  const v = skillVerdict(plugin, 'project', false);
  assert.equal(v.status, 'warn');
  assert.match(v.note, /the project asks for it/);
});

test('a user-directory skill the project asks for warns: it exists on one machine', () => {
  const v = skillVerdict(userSkill, 'project', false);
  assert.equal(v.status, 'warn');
  assert.match(v.note, /exists only in this machine/);
});

test('a project skill always passes', () => {
  assert.equal(skillVerdict(projectSkill, 'project', true).status, 'pass');
});

test('a missing skill fails in a required slot and warns in an optional one, whatever the layer', () => {
  assert.equal(skillVerdict(missing, 'user', true).status, 'fail');
  assert.equal(skillVerdict(missing, 'project', false).status, 'warn');
});

test('an unplaced skill is left for the agent to confirm', () => {
  assert.equal(skillVerdict(unplaced, 'project', true).status, 'info');
});
