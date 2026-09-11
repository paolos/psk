# Changelog

## [0.1.0] - 2026-09-11

### Added

- **Three-layer configuration with a floor.** `~/.claude/psk.json`, `.claude/psk.json`
  and `.claude/psk.local.json`, merged like Claude Code's own settings. A slot any layer
  marks required stays required and collects every layer's skills, so a personal file
  can add a reviewer but never remove the team's. Waivers count from the project layer
  only. `code-review ultra` is refused as a step: it is billed and user-launched.
- **`/psk:doctor`.** Repository (default branch protection, squash merge, uncommitted
  Claude settings), psk (initialised, config valid, local file gitignored), skills
  (where each configured one comes from, which permissions point at skills that no
  longer exist), Jira and project commands. The script covers what a script can see;
  the skill adds what only the agent sees — which skills are loaded in the session, and
  the live Jira checks.
- **`/psk:setup`.** Explores, then asks one section at a time with the recommended
  answer first — Jira with transition ids, project commands, one or more skills per
  slot — shows every draft, and writes the layers, the `.gitignore` line and a
  `## psk` block in `CLAUDE.md`.
