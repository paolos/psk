import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveConfig, normalizeSkill } from './config.mjs';

const names = (slot) => slot.skills.map((s) => s.name);

test('no layers: empty result, nothing wrong', () => {
  const r = resolveConfig({});
  assert.deepEqual(r.effective, {});
  assert.deepEqual(r.errors, []);
});

test('ordinary keys: local beats project beats user', () => {
  const r = resolveConfig({
    user: { jira: { project: 'U', board: 1 } },
    project: { jira: { project: 'P' } },
    local: { jira: { board: 3 } },
  });
  assert.equal(r.effective.jira.project, 'P');
  assert.equal(r.effective.jira.board, 3);
  assert.equal(r.origins['jira.project'], 'project');
  assert.equal(r.origins['jira.board'], 'local');
});

test('arrays are replaced, not merged', () => {
  const r = resolveConfig({ project: { checks: ['a', 'b'] }, local: { checks: ['c'] } });
  assert.deepEqual(r.effective.checks, ['c']);
});

test('floor: a required slot cannot be unset from above the project', () => {
  const r = resolveConfig({
    project: { slots: { 'land.review': { required: true, skills: ['code-review'] } } },
    local: { slots: { 'land.review': { required: false } } },
  });
  assert.equal(r.effective.slots['land.review'].required, true);
  assert.match(r.warnings.join('\n'), /cannot be removed/);
});

test('floor: a required slot unions skills from every layer, project first', () => {
  const r = resolveConfig({
    user: { slots: { 'land.review': { skills: ['security-review'] } } },
    project: { slots: { 'land.review': { required: true, skills: ['code-review'] } } },
    local: { slots: { 'land.review': { skills: ['mattpocock-skills:code-review'] } } },
  });
  assert.deepEqual(names(r.effective.slots['land.review']), [
    'code-review',
    'security-review',
    'mattpocock-skills:code-review',
  ]);
  assert.equal(r.origins['slots.land.review.skills.security-review'], 'user');
});

test('floor: a lower layer cannot drop a skill the project put in a required slot', () => {
  const r = resolveConfig({
    project: { slots: { 'land.review': { required: true, skills: ['code-review', 'simplify'] } } },
    local: { slots: { 'land.review': { skills: ['code-review'] } } },
  });
  assert.deepEqual(names(r.effective.slots['land.review']), ['code-review', 'simplify']);
});

test('strengthening is allowed from any layer', () => {
  const r = resolveConfig({
    local: { slots: { 'dev.method': { required: true, skills: ['mattpocock-skills:tdd'] } } },
  });
  assert.equal(r.effective.slots['dev.method'].required, true);
  assert.deepEqual(r.warnings, []);
});

test('an ordinary slot takes the highest layer that names any skill', () => {
  const r = resolveConfig({
    project: { slots: { 'dev.verify': { skills: ['ios-simulator-qa'] } } },
    local: { slots: { 'dev.verify': { skills: ['android-emulator-qa'] } } },
  });
  assert.deepEqual(names(r.effective.slots['dev.verify']), ['android-emulator-qa']);
});

test('a waiver counts only from the project', () => {
  const fromLocal = resolveConfig({
    project: { slots: { 'land.review': { required: true } } },
    local: { slots: { 'land.review': { waived: 'no time' } } },
  });
  assert.equal(fromLocal.effective.slots['land.review'].waived, undefined);
  assert.match(fromLocal.errors.join('\n'), /no layer names a skill/);

  const fromProject = resolveConfig({
    project: { slots: { 'land.review': { required: true, waived: 'docs-only repo' } } },
  });
  assert.equal(fromProject.effective.slots['land.review'].waived, 'docs-only repo');
  assert.deepEqual(fromProject.errors, []);
});

test('a required slot with no skill and no waiver is an error', () => {
  const r = resolveConfig({ project: { slots: { 'land.review': { required: true } } } });
  assert.match(r.errors.join('\n'), /required, but no layer names a skill/);
});

test('code-review ultra cannot be configured as a step', () => {
  const r = resolveConfig({
    project: { slots: { 'land.review': { required: true, skills: [{ name: 'code-review', args: 'ultra' }] } } },
  });
  assert.match(r.errors.join('\n'), /launched by the user only/);
});

test('code-review at an ordinary level is fine', () => {
  const r = resolveConfig({
    project: { slots: { 'land.review': { required: true, skills: [{ name: 'code-review', args: 'high' }] } } },
  });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.effective.slots['land.review'].skills, [{ name: 'code-review', args: 'high' }]);
});

test('unknown slots and keys warn instead of failing', () => {
  const r = resolveConfig({ project: { slots: { 'dev.nope': { skills: ['x'] } }, extra: 1 } });
  assert.match(r.warnings.join('\n'), /not a known slot/);
  assert.match(r.warnings.join('\n'), /unknown key "extra"/);
  assert.deepEqual(r.errors, []);
});

test('a version this psk does not read is an error', () => {
  const r = resolveConfig({ project: { version: 2 } });
  assert.match(r.errors.join('\n'), /reads version 1/);
});

test('a scalar replacing an object drops the stale origins beneath it', () => {
  const r = resolveConfig({
    project: { release: { bump: 'x', changelog: 'CHANGELOG.md' } },
    local: { release: 'disabled' },
  });
  assert.equal(r.effective.release, 'disabled');
  assert.equal(r.origins['release'], 'local');
  assert.equal(r.origins['release.bump'], undefined);
});

test('normalizeSkill accepts names and {name, args}', () => {
  assert.deepEqual(normalizeSkill('simplify'), { name: 'simplify' });
  assert.deepEqual(normalizeSkill({ name: 'code-review', args: 'high' }), { name: 'code-review', args: 'high' });
  assert.equal(normalizeSkill(42), null);
});
