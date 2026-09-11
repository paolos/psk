#!/usr/bin/env node
// psk doctor: the deterministic half of the health check.
//
// Everything a script can establish on its own lives here — git, GitHub, files,
// the merged config, where each configured skill comes from. What only the agent
// can see stays with the agent: whether a skill is actually loaded in its session,
// and the live Jira checks over MCP. The doctor skill runs this first, then those.
//
// Every check carries the scopes it belongs to. `/psk:doctor` runs them all;
// `/psk:dev` and `/psk:land` run their own scope as a PREFLIGHT, before touching
// anything, so a missing review skill stops a land at the start and not halfway.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { loadConfig } from './config.mjs';
import { discoverSkills, placeSkill } from './skills.mjs';

// One scope per command. A check with no explicit scopes applies to every command.
const SCOPES = ['all', 'spec', 'ready', 'dev', 'land'];

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', timeout: 20000, ...opts });
  return {
    ok: res.status === 0,
    status: res.status,
    out: (res.stdout ?? '').trim(),
    err: (res.stderr ?? '').trim(),
    missing: res.error?.code === 'ENOENT',
  };
}

/** Parse `Skill(name)` / `Skill(name:*)` out of Claude Code permission lists.
 *  Both forms name the same skill, so each (file, skill) pair is reported once. */
function permissionSkills(root) {
  const found = [];
  const seen = new Set();
  for (const file of ['settings.json', 'settings.local.json']) {
    const p = path.join(root, '.claude', file);
    if (!fs.existsSync(p)) continue;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      continue;
    }
    for (const rule of data?.permissions?.allow ?? []) {
      const m = /^Skill\(([^)]+)\)$/.exec(rule);
      if (!m) continue;
      const name = m[1].replace(/:\*$/, '');
      const key = `${file}\0${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ file: `.claude/${file}`, name });
    }
  }
  return found;
}

/** The psk copy this script belongs to: the plugin root one level above scripts/. */
export function runningCopy(scriptFile = fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(scriptFile), '..');
  try {
    const m = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
    return { name: m.name, version: m.version, root };
  } catch {
    return { name: 'psk', version: 'unknown', root };
  }
}

/** Every install of any plugin, from Claude Code's registry. */
export function installedCopies(home = os.homedir()) {
  const file = path.join(home, '.claude', 'plugins', 'installed_plugins.json');
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Object.entries(data.plugins ?? data).flatMap(([key, value]) =>
      (Array.isArray(value) ? value : [value]).map((v) => ({ key, ...v })),
    );
  } catch {
    return [];
  }
}

/**
 * Which psk is running, against which is installed. The running copy is the one the
 * session loaded — the skill runs the scripts beside it — so a mismatch means the
 * session has not picked up an update: the skills say one thing and the installed
 * plugin another.
 */
export function versionVerdict(running, installs) {
  const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
  const mine = installs.filter((i) => i.key.split('@')[0] === running.name && i.installPath);
  const describe = (i) => `${i.version} (${i.scope} scope${i.gitCommitSha ? ` · ${i.gitCommitSha.slice(0, 7)}` : ''})`;

  if (!mine.length) {
    return { status: 'info', message: `psk ${running.version} from ${running.root} — not installed as a plugin` };
  }
  const here = mine.find((i) => same(i.installPath, running.root));
  if (here) return { status: 'pass', message: `psk ${describe(here)}` };
  if (/[\\/]plugins[\\/]cache[\\/]/i.test(running.root)) {
    return {
      status: 'warn',
      message: `this session runs psk ${running.version}, but ${mine.map(describe).join(', ')} is installed`,
      hint: '/reload-plugins, so the skills and their scripts are the installed version',
    };
  }
  return {
    status: 'info',
    message: `psk ${running.version} from a checkout (${running.root}); installed: ${mine.map(describe).join(', ')}`,
  };
}

/**
 * The verdict on one configured skill. Portability depends on WHICH LAYER configures
 * the skill, not only where the skill comes from: a plugin skill a person adds in their
 * own user or local layer never reaches a teammate, so warning them about it is noise.
 * Only a skill the project file asks for has to exist on every machine.
 *
 * @param {{origin: string, detail: string}} placed  from skills.mjs placeSkill()
 * @param {string|undefined} layer  the config layer that named the skill
 * @param {boolean} required  whether its slot is required
 * @returns {{status: 'pass'|'warn'|'fail'|'info', note: string}}
 */
export function skillVerdict(placed, layer, required) {
  if (placed.origin === 'missing') {
    return { status: required ? 'fail' : 'warn', note: placed.detail };
  }
  if (placed.origin === 'unplaced') return { status: 'info', note: placed.detail };
  if (placed.origin === 'project') return { status: 'pass', note: 'project skill — travels with the repository' };
  if (layer !== 'project') {
    return { status: 'pass', note: `${placed.origin} skill, set in your ${layer ?? 'own'} layer — teammates unaffected` };
  }
  return {
    status: 'warn',
    note:
      placed.origin === 'plugin'
        ? `the project asks for it — ${placed.detail}`
        : 'the project asks for it, but it exists only in this machine\'s ~/.claude/skills',
  };
}

export function collectChecks({ runChecks = false } = {}) {
  const checks = [];
  const add = (group, id, status, message, { hint, scopes = SCOPES } = {}) =>
    checks.push({ group, id, status, message, ...(hint ? { hint } : {}), scopes });

  // --- repository ----------------------------------------------------------
  const cfg = loadConfig();
  const root = cfg.paths.root;
  if (!root) {
    add('repository', 'repo.git', 'fail', 'not inside a git repository', {
      hint: 'run psk from the root of a project checkout',
    });
    return { checks, config: cfg };
  }
  add('repository', 'repo.git', 'pass', root);

  const remote = run('git', ['remote', 'get-url', 'origin'], { cwd: root });
  if (remote.ok) add('repository', 'repo.remote', 'pass', remote.out);
  else add('repository', 'repo.remote', 'warn', 'no "origin" remote', { hint: 'land pushes and opens PRs on origin' });

  const gh = run('gh', ['auth', 'status'], { cwd: root });
  const ghReady = gh.ok;
  if (gh.missing) {
    add('repository', 'repo.gh', 'warn', 'gh CLI not found', { hint: 'land opens and merges PRs through gh' });
  } else if (!gh.ok) {
    add('repository', 'repo.gh', 'warn', 'gh is not authenticated', { hint: 'gh auth login' });
  } else {
    const who = /Logged in to \S+ account (\S+)/.exec(`${gh.out}\n${gh.err}`);
    add('repository', 'repo.gh', 'pass', who ? `authenticated as ${who[1]}` : 'authenticated');
  }

  if (ghReady && remote.ok) {
    const view = run('gh', ['repo', 'view', '--json', 'nameWithOwner,defaultBranchRef'], { cwd: root });
    if (view.ok) {
      const info = JSON.parse(view.out);
      const repo = info.nameWithOwner;
      const branch = info.defaultBranchRef?.name ?? 'main';
      add('repository', 'repo.default-branch', 'pass', `${repo} → ${branch}`);

      const prot = run('gh', ['api', `repos/${repo}/branches/${branch}/protection`], { cwd: root });
      if (prot.ok) {
        add('repository', 'repo.protection', 'pass', `${branch} is protected`, { scopes: ['all', 'land'] });
      } else if (/404|Not Found|not protected/i.test(`${prot.out}${prot.err}`)) {
        add('repository', 'repo.protection', 'fail', `${branch} is not protected — anyone can commit to it directly`, {
          hint: 'Settings → Branches → add a rule for the default branch requiring a PR',
          scopes: ['all', 'land'],
        });
      } else {
        add('repository', 'repo.protection', 'warn', `cannot read protection for ${branch} (${prot.err.split('\n')[0]})`, {
          hint: 'reading branch protection needs admin rights on the repository',
          scopes: ['all', 'land'],
        });
      }

      const settings = run('gh', ['api', `repos/${repo}`, '--jq', '.allow_squash_merge'], { cwd: root });
      if (settings.ok && settings.out === 'true') {
        add('repository', 'repo.squash', 'pass', 'squash merge enabled', { scopes: ['all', 'land'] });
      } else if (settings.ok) {
        add('repository', 'repo.squash', 'fail', 'squash merge is disabled', {
          hint: 'land squash-merges: one commit per PR, carrying the version in its subject',
          scopes: ['all', 'land'],
        });
      }
    }
  }

  const settingsTracked = run('git', ['ls-files', '--error-unmatch', '.claude/settings.json'], { cwd: root });
  if (fs.existsSync(path.join(root, '.claude', 'settings.json')) && !settingsTracked.ok) {
    add('repository', 'repo.claude-settings', 'warn', '.claude/settings.json exists but is not committed', {
      hint: 'project settings only reach teammates once committed',
      scopes: ['all'],
    });
  }

  // --- psk -----------------------------------------------------------------
  const v = versionVerdict(runningCopy(), installedCopies());
  add('psk', 'psk.version', v.status, v.message, { hint: v.hint });

  if (cfg.present.project) {
    add('psk', 'psk.initialized', 'pass', path.relative(root, cfg.paths.project));
  } else {
    add('psk', 'psk.initialized', 'fail', 'this project has no .claude/psk.json', { hint: 'run /psk:setup' });
  }

  if (cfg.errors.length) {
    cfg.errors.forEach((e) => add('psk', 'psk.config', 'fail', e));
  } else if (cfg.present.project || cfg.present.user || cfg.present.local) {
    add('psk', 'psk.config', 'pass', 'configuration resolves without errors');
  }
  cfg.warnings.forEach((w) => add('psk', 'psk.config', 'warn', w));

  const ignored = run('git', ['check-ignore', '-q', '.claude/psk.local.json'], { cwd: root });
  if (ignored.ok) {
    add('psk', 'psk.local-ignored', 'pass', '.claude/psk.local.json is gitignored');
  } else {
    add('psk', 'psk.local-ignored', 'fail', '.claude/psk.local.json is not gitignored', {
      hint: 'add it to .gitignore before creating it — it holds settings for this machine only',
    });
  }

  // --- skills --------------------------------------------------------------
  const discovered = discoverSkills({ cwd: root });
  const slots = cfg.effective.slots ?? {};
  const toConfirm = [];
  for (const [slotId, slot] of Object.entries(slots)) {
    const phase = slotId.split('.')[0];
    const scopes = ['all', ...(SCOPES.includes(phase) ? [phase] : [])];
    for (const skill of slot.skills) {
      const placed = placeSkill(skill.name, discovered);
      const layer = cfg.origins[`slots.${slotId}.skills.${skill.name}`];
      const { status, note } = skillVerdict(placed, layer, slot.required);
      const label = `${slotId} → ${skill.name}${skill.args ? ` ${skill.args}` : ''}`;
      if (placed.origin === 'unplaced') {
        toConfirm.push({ slot: slotId, skill: skill.name, required: slot.required, layer });
      }
      let hint;
      if (placed.origin === 'missing') {
        hint = slot.required ? 'a required slot: land stops rather than skip it' : 'optional: skipped, and said so in the PR';
      }
      add('skills', `skill.${slotId}`, status, `${label}: ${note}`, { hint, scopes });
    }
  }

  for (const perm of permissionSkills(root)) {
    const placed = placeSkill(perm.name, discovered);
    if (placed.origin === 'missing' || placed.origin === 'unplaced') {
      add('skills', 'skill.stale-permission', 'warn', `${perm.file} allows Skill(${perm.name}), which no project, user or plugin skill provides`, {
        hint: 'a leftover from a skill that was removed — or a built-in, if the session lists it',
        scopes: ['all'],
      });
    }
  }

  // --- jira (config only; the live checks belong to the agent) -------------
  const jira = cfg.effective.jira;
  if (!jira) {
    add('jira', 'jira.config', cfg.present.project ? 'warn' : 'info', 'no jira section configured', { hint: 'run /psk:setup' });
  } else {
    const missing = ['cloudId', 'project'].filter((k) => !jira[k]);
    if (missing.length) add('jira', 'jira.config', 'fail', `jira is missing ${missing.join(', ')}`);
    else add('jira', 'jira.config', 'pass', `${jira.project}${jira.board ? ` · board ${jira.board}` : ''}`);
    // The moves psk makes itself; `done` belongs to the release, not to any command.
    const needed = ['speccing', 'building', 'shipping'];
    const absent = needed.filter((t) => !jira.transitions?.[t]);
    if (absent.length) {
      add('jira', 'jira.transitions', 'warn', `no transition id recorded for ${absent.join(', ')}`, {
        hint: 'transition names differ from status names in most workflows — record the ids with /psk:setup',
      });
    } else {
      add('jira', 'jira.transitions', 'pass', `transitions: ${needed.map((t) => `${t}=${jira.transitions[t]}`).join(' ')}`);
    }
  }

  // --- project -------------------------------------------------------------
  const template = cfg.effective.spec?.template;
  if (template) {
    const exists = fs.existsSync(path.resolve(root, template));
    add('project', 'project.spec-template', exists ? 'pass' : 'fail', `spec template: ${template}${exists ? '' : ' — not found'}`, {
      hint: exists ? undefined : 'spec.template is resolved from the repository root',
      scopes: ['all', 'spec', 'ready'],
    });
  }

  const release = cfg.effective.release;
  if (!release?.bump) {
    add('project', 'project.release', cfg.present.project ? 'warn' : 'info', 'no release.bump command configured', {
      hint: 'land runs it to cut the version',
      scopes: ['all', 'land'],
    });
  } else {
    add('project', 'project.release', 'pass', `bump: ${release.bump}`, { scopes: ['all', 'land'] });
  }

  for (const cmd of cfg.effective.checks ?? []) {
    if (!runChecks) {
      add('project', 'project.check', 'info', `${cmd} (declared — pass --run-checks to execute)`);
      continue;
    }
    const res = run(cmd, [], { cwd: root, shell: true, timeout: 600000 });
    add('project', 'project.check', res.ok ? 'pass' : 'fail', `${cmd} → exit ${res.status}`);
  }

  return { checks, config: cfg, toConfirm };
}

const SYMBOL = { pass: '✓', warn: '⚠', fail: '✗', info: '·' };

function main(argv) {
  const scopeArg = argv.find((a) => a.startsWith('--scope='))?.split('=')[1] ?? 'all';
  if (!SCOPES.includes(scopeArg)) {
    console.error(`--scope must be one of ${SCOPES.join(', ')}`);
    return 2;
  }
  const { checks, toConfirm = [] } = collectChecks({ runChecks: argv.includes('--run-checks') });
  const selected = checks.filter((c) => c.scopes.includes(scopeArg));

  if (argv.includes('--json')) {
    console.log(JSON.stringify({ scope: scopeArg, checks: selected, toConfirm }, null, 2));
  } else {
    let group = null;
    for (const c of selected) {
      if (c.group !== group) {
        if (group) console.log('');
        console.log(c.group);
        group = c.group;
      }
      console.log(`  ${SYMBOL[c.status]} ${c.message}`);
      if (c.hint && c.status !== 'pass') console.log(`      → ${c.hint}`);
    }
    const counts = Object.fromEntries(['fail', 'warn', 'pass'].map((s) => [s, selected.filter((c) => c.status === s).length]));
    console.log(`\n${counts.fail} fail · ${counts.warn} warn · ${counts.pass} pass`);
  }
  return selected.some((c) => c.status === 'fail') ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}
