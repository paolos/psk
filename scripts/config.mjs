#!/usr/bin/env node
// psk configuration: three layers, merged with a floor.
//
// Layers, lowest to highest precedence — the same shape as Claude Code's own
// settings.json, so nobody has to learn a new one:
//
//   user     ~/.claude/psk.json            who you are, personal defaults
//   project  <repo>/.claude/psk.json       the team contract, committed
//   local    <repo>/.claude/psk.local.json this machine only, gitignored
//
// Ordinary keys merge by precedence: a higher layer wins. Slots follow one extra
// rule, the FLOOR: a guarantee can be added from any layer and removed from none.
// Once any layer marks a slot required, it stays required, and its skills are the
// union of every layer's — a lower or higher layer can add a skill to a required
// slot, never take one away. Otherwise the team contract would hold only until the
// first person overrode it on their own machine.
//
// The merge is deterministic on purpose. It is the part of psk most likely to be
// got subtly wrong by reading three files and reasoning about them, and the part
// every other command depends on.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const LAYERS = ['user', 'project', 'local'];

export const KNOWN_KEYS = ['version', 'jira', 'release', 'checks', 'slots'];

export const CONFIG_VERSION = 1;

// The slot catalogue: the one place a slot is defined. /psk:setup reads it through
// `config.mjs slots` rather than keeping its own copy.
//
// perMachine: the natural home is psk.local.json, because what fits depends on the
// machine (a simulator skill cannot run on Windows).
export const SLOTS = {
  'spec.research': {
    summary: 'Gather facts from primary sources before the spec is written.',
    perMachine: false,
  },
  'spec.challenge': {
    summary: 'Stress-test the spec before it goes to /psk:ready.',
    perMachine: false,
  },
  'dev.method': {
    summary: 'How implementation is driven, e.g. test-first.',
    perMachine: false,
  },
  'dev.bugfix': {
    summary: 'Used in place of dev.method when the ticket is a bug.',
    perMachine: false,
  },
  'dev.verify': {
    summary: 'See the change working in the real app.',
    perMachine: true,
  },
  'land.conflicts': {
    summary: 'Resolve conflicts after rebasing onto main.',
    perMachine: false,
  },
  'land.cleanup': {
    summary: 'Simplification pass. Runs BEFORE land.review, so the reviewed diff is the one that merges.',
    perMachine: false,
  },
  'land.review': {
    summary: 'Review of the final diff. Required by default: the gate every land passes.',
    perMachine: false,
  },
};

// Skills that must never run as an unattended step. `code-review ultra` is billed
// and launched by the user only.
const USER_ONLY = [{ name: 'code-review', argsMatch: /\bultra\b/ }];

// ---------------------------------------------------------------------------
// Pure merge
// ---------------------------------------------------------------------------

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

/** A skill reference is a bare name or {name, args}. */
export function normalizeSkill(entry) {
  if (typeof entry === 'string') return { name: entry };
  if (isPlainObject(entry) && typeof entry.name === 'string') {
    return entry.args === undefined ? { name: entry.name } : { name: entry.name, args: String(entry.args) };
  }
  return null;
}

function mergeGeneric(layersData, effective, origins) {
  for (const layer of LAYERS) {
    const data = layersData[layer];
    if (isPlainObject(data)) walk(data, effective, origins, layer, '');
  }
}

function dropOrigins(origins, p) {
  for (const key of Object.keys(origins)) {
    if (key === p || key.startsWith(`${p}.`)) delete origins[key];
  }
}

function walk(src, dst, origins, layer, prefix) {
  for (const [key, value] of Object.entries(src)) {
    if (prefix === '' && key === 'slots') continue;
    const p = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      if (!isPlainObject(dst[key])) {
        dst[key] = {};
        dropOrigins(origins, p);
      }
      walk(value, dst[key], origins, layer, p);
    } else {
      dst[key] = clone(value);
      dropOrigins(origins, p);
      origins[p] = layer;
    }
  }
}

function mergeSlots(layersData, effective, origins, warnings, errors) {
  const ids = new Set();
  for (const layer of LAYERS) {
    const slots = layersData[layer]?.slots;
    if (isPlainObject(slots)) Object.keys(slots).forEach((id) => ids.add(id));
  }
  if (ids.size === 0) return;

  effective.slots = {};
  for (const id of [...ids].sort()) {
    if (!SLOTS[id]) warnings.push(`slots.${id}: not a known slot — ignored by this version of psk.`);

    const perLayer = {};
    for (const layer of LAYERS) {
      const raw = layersData[layer]?.slots?.[id];
      if (isPlainObject(raw)) perLayer[layer] = raw;
    }

    // Required: any layer can set it, no layer can unset it once another has.
    const setters = LAYERS.filter((l) => perLayer[l]?.required === true);
    const required = setters.length > 0;
    for (const l of LAYERS) {
      if (required && perLayer[l]?.required === false && !setters.includes(l)) {
        warnings.push(
          `slots.${id}.required: ${l} sets false, but ${setters.join(', ')} requires it — a guarantee cannot be removed; it stays required.`,
        );
      }
    }

    // Waiver: honoured from the project only. It is a team decision, recorded where
    // the team can see it and review it.
    let waived;
    for (const l of LAYERS) {
      const w = perLayer[l]?.waived;
      if (w === undefined) continue;
      if (l === 'project') waived = String(w);
      else warnings.push(`slots.${id}.waived: set in ${l} — a waiver is honoured from the project layer only; ignored.`);
    }

    // Skills: a required slot unions every layer, project first so the contract's
    // own order is kept; an ordinary slot takes the highest layer that names any.
    const skills = [];
    const skillOrigins = [];
    const seen = new Set();
    const add = (entry, layer) => {
      const s = normalizeSkill(entry);
      if (!s) {
        errors.push(`slots.${id}.skills (${layer}): ${JSON.stringify(entry)} is not a skill name or {name, args}.`);
        return;
      }
      if (seen.has(s.name)) return;
      seen.add(s.name);
      skills.push(s);
      skillOrigins.push(layer);
    };

    if (required) {
      for (const l of ['project', 'user', 'local']) {
        const list = perLayer[l]?.skills;
        if (Array.isArray(list)) list.forEach((e) => add(e, l));
      }
    } else {
      const top = [...LAYERS].reverse().find((l) => Array.isArray(perLayer[l]?.skills));
      if (top) perLayer[top].skills.forEach((e) => add(e, top));
    }

    for (const s of skills) {
      for (const rule of USER_ONLY) {
        if (s.name === rule.name && rule.argsMatch.test(s.args ?? '')) {
          errors.push(
            `slots.${id}: "${s.name} ${s.args}" is billed and launched by the user only — it cannot be an unattended step.`,
          );
        }
      }
    }

    if (required && skills.length === 0 && waived === undefined) {
      errors.push(`slots.${id}: required, but no layer names a skill for it and the project records no waiver.`);
    }

    const slot = { required, skills };
    if (waived !== undefined) slot.waived = waived;
    effective.slots[id] = slot;

    if (setters.length) origins[`slots.${id}.required`] = setters.join('+');
    skillOrigins.forEach((l, i) => {
      origins[`slots.${id}.skills.${skills[i].name}`] = l;
    });
    if (waived !== undefined) origins[`slots.${id}.waived`] = 'project';
  }
}

/**
 * Merge already-parsed layers. Pure: no filesystem, so every rule is testable.
 *
 * @param {{user?: object, project?: object, local?: object}} layersData
 * @returns {{effective: object, origins: Record<string,string>, warnings: string[], errors: string[]}}
 */
export function resolveConfig(layersData) {
  const effective = {};
  const origins = {};
  const warnings = [];
  const errors = [];

  for (const layer of LAYERS) {
    const data = layersData[layer];
    if (data === undefined) continue;
    if (!isPlainObject(data)) {
      errors.push(`${layer}: the file must hold a JSON object.`);
      continue;
    }
    for (const key of Object.keys(data)) {
      if (!KNOWN_KEYS.includes(key)) warnings.push(`${layer}: unknown key "${key}" — ignored.`);
    }
    if (data.version !== undefined && data.version !== CONFIG_VERSION) {
      errors.push(`${layer}: version ${JSON.stringify(data.version)} — this psk reads version ${CONFIG_VERSION}.`);
    }
  }

  mergeGeneric(layersData, effective, origins);
  mergeSlots(layersData, effective, origins, warnings, errors);

  return { effective, origins, warnings, errors };
}

// ---------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------

export function repoRoot(cwd = process.cwd()) {
  const res = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' });
  return res.status === 0 ? path.resolve(res.stdout.trim()) : null;
}

export function layerPaths({ cwd = process.cwd(), home = os.homedir() } = {}) {
  const root = repoRoot(cwd);
  return {
    root,
    user: path.join(home, '.claude', 'psk.json'),
    project: root ? path.join(root, '.claude', 'psk.json') : null,
    local: root ? path.join(root, '.claude', 'psk.local.json') : null,
  };
}

/** Read one layer. A missing file is an empty layer, not an error. */
export function readLayer(file) {
  if (!file || !fs.existsSync(file)) return { exists: false };
  const text = fs.readFileSync(file, 'utf8');
  try {
    return { exists: true, data: JSON.parse(text) };
  } catch (err) {
    return { exists: true, error: `${file}: not valid JSON — ${err.message}` };
  }
}

export function loadConfig(opts = {}) {
  const paths = layerPaths(opts);
  const layersData = {};
  const readErrors = [];
  const present = {};
  for (const layer of LAYERS) {
    const r = readLayer(paths[layer]);
    present[layer] = r.exists;
    if (r.error) readErrors.push(r.error);
    else if (r.exists) layersData[layer] = r.data;
  }
  const result = resolveConfig(layersData);
  result.errors.unshift(...readErrors);
  return { paths, present, ...result };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printHuman({ paths, present, effective, origins, warnings, errors }, showOrigin) {
  const out = [];
  out.push('layers');
  for (const layer of LAYERS) {
    const p = paths[layer] ?? '(not in a git repository)';
    out.push(`  ${layer.padEnd(8)} ${present[layer] ? '●' : '○'} ${p}`);
  }
  out.push('');
  out.push('effective');
  const lines = JSON.stringify(effective, null, 2).split('\n');
  out.push(...lines.map((l) => `  ${l}`));
  if (showOrigin && Object.keys(origins).length) {
    out.push('');
    out.push('origin');
    for (const [k, v] of Object.entries(origins).sort()) out.push(`  ${k.padEnd(44)} ${v}`);
  }
  if (warnings.length) {
    out.push('');
    out.push('warnings');
    warnings.forEach((w) => out.push(`  ⚠ ${w}`));
  }
  if (errors.length) {
    out.push('');
    out.push('errors');
    errors.forEach((e) => out.push(`  ✗ ${e}`));
  }
  console.log(out.join('\n'));
}

function main(argv) {
  const [cmd = 'resolve', ...rest] = argv;
  const json = rest.includes('--json');

  if (cmd === 'slots') {
    console.log(json ? JSON.stringify(SLOTS, null, 2) : Object.entries(SLOTS)
      .map(([id, s]) => `${id.padEnd(16)} ${s.perMachine ? '[per machine] ' : ''}${s.summary}`)
      .join('\n'));
    return 0;
  }

  if (cmd === 'paths') {
    const p = layerPaths();
    console.log(JSON.stringify(p, null, 2));
    return 0;
  }

  if (cmd === 'resolve') {
    const result = loadConfig();
    if (json) console.log(JSON.stringify(result, null, 2));
    else printHuman(result, rest.includes('--show-origin'));
    return result.errors.length ? 1 : 0;
  }

  console.error(`usage: config.mjs [resolve [--json] [--show-origin] | slots [--json] | paths]`);
  return 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}
