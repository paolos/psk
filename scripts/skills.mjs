#!/usr/bin/env node
// Where a skill comes from — which decides whether a teammate will have it.
//
//   project  <repo>/.claude/skills/<name>   travels with the repository
//   user     ~/.claude/skills/<name>        this machine only
//   plugin   <plugin>:<name>                every machine must install the plugin
//
// Built-in skills (code-review, simplify, security-review, …) ship with Claude Code
// and live in none of these places, so a script cannot see them. Anything this
// module cannot place comes back as `unplaced`: the agent running psk confirms it
// against the skills actually loaded in its session, which only it can see.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { repoRoot } from './config.mjs';

function frontmatterName(skillMd) {
  try {
    const head = fs.readFileSync(skillMd, 'utf8').split(/\r?\n/, 20);
    if (head[0] !== '---') return null;
    for (const line of head.slice(1)) {
      if (line === '---') break;
      const m = /^name:\s*["']?([^"'\s]+)["']?\s*$/.exec(line);
      if (m) return m[1];
    }
  } catch {
    // unreadable skill file: fall back to the directory name
  }
  return null;
}

function skillsInDir(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const md = path.join(dir, entry.name, 'SKILL.md');
    if (fs.existsSync(md)) out.push({ name: frontmatterName(md) ?? entry.name, dir: path.join(dir, entry.name) });
  }
  return out;
}

function installedPlugins(home) {
  const file = path.join(home, '.claude', 'plugins', 'installed_plugins.json');
  if (!fs.existsSync(file)) return [];
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
  const table = data.plugins ?? data;
  const out = [];
  for (const [key, value] of Object.entries(table)) {
    const install = Array.isArray(value) ? value[0] : value;
    const installPath = install?.installPath;
    const plugin = key.split('@')[0];
    let skills = [];
    const manifest = installPath && path.join(installPath, '.claude-plugin', 'plugin.json');
    if (manifest && fs.existsSync(manifest)) {
      try {
        const m = JSON.parse(fs.readFileSync(manifest, 'utf8'));
        skills = (m.skills ?? []).map((rel) => {
          const dir = path.resolve(installPath, rel);
          return frontmatterName(path.join(dir, 'SKILL.md')) ?? path.basename(dir);
        });
      } catch {
        // an unreadable manifest leaves the plugin with no known skills
      }
    }
    out.push({ plugin, key, installPath, skills });
  }
  return out;
}

/**
 * Every skill this machine can place, keyed by the name psk config uses.
 * @returns {{skills: Map<string, {origin: string, detail: string}>, plugins: object[]}}
 */
export function discoverSkills({ cwd = process.cwd(), home = os.homedir() } = {}) {
  const root = repoRoot(cwd);
  const skills = new Map();
  for (const s of skillsInDir(root && path.join(root, '.claude', 'skills'))) {
    skills.set(s.name, { origin: 'project', detail: 'travels with the repository' });
  }
  for (const s of skillsInDir(path.join(home, '.claude', 'skills'))) {
    if (!skills.has(s.name)) skills.set(s.name, { origin: 'user', detail: 'this machine only' });
  }
  const plugins = installedPlugins(home);
  for (const p of plugins) {
    for (const name of p.skills) {
      skills.set(`${p.plugin}:${name}`, {
        origin: 'plugin',
        detail: `every machine must install the "${p.plugin}" plugin`,
      });
    }
  }
  return { skills, plugins };
}

/** Place one configured skill name. */
export function placeSkill(name, discovered) {
  const hit = discovered.skills.get(name);
  if (hit) return { name, ...hit };
  const [prefix] = name.includes(':') ? name.split(':') : [];
  if (prefix && !discovered.plugins.some((p) => p.plugin === prefix)) {
    return { name, origin: 'missing', detail: `the "${prefix}" plugin is not installed on this machine` };
  }
  if (prefix) {
    return { name, origin: 'missing', detail: `the "${prefix}" plugin is installed but has no skill "${name.split(':')[1]}"` };
  }
  return { name, origin: 'unplaced', detail: 'built-in or not installed — confirm against the session skill list' };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { skills, plugins } = discoverSkills();
  const rows = [...skills.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ skills: Object.fromEntries(rows), plugins }, null, 2));
  } else {
    for (const [name, s] of rows) console.log(`${s.origin.padEnd(8)} ${name}`);
  }
}
