# Changelog

## [0.2.1] - 2026-09-11

### Fixed

- **doctor no longer warns teammates about skills they will never receive.** A plugin
  skill set in your own user or local layer was reported as "every machine must install
  the plugin", which is only true when the project file asks for it. Portability now
  depends on the layer that configures the skill: project-layer plugin skills warn,
  user- and local-layer ones pass as "teammates unaffected". Found on the first real
  setup, where six of eight warnings were this false alarm. The verdict is a pure
  function, `skillVerdict`, with its own tests.

## [0.2.0] - 2026-09-11

### Added

- **The four workflow commands.** `/psk:spec` writes the spec into the ticket and moves
  it to Speccing. `/psk:ready` is the gate: seven checks, and a ticket either passes
  whole into Building or is refused with the list of what is missing. `/psk:dev` builds
  one ticket assigned to you on its own branch and stops at the open PR. `/psk:land` is
  the only path to the base branch: rebase, cleanup, review of the final diff, checks,
  version, squash-merge, ticket to Shipping.
- **`docs/workflow.md`**, the lifecycle every command follows. One ticket, one branch,
  one PR — always. When dev finds the spec wrong, the ticket goes back to Speccing with
  a comment instead of being patched over in the PR. dev writes the changelog entry
  under `[Unreleased]`; land cuts the version after the rebase, so parallel PRs never
  claim the same number.
- **Project conventions in the config**: `spec.template`, `ready.requireEstimate`,
  `ready.blockingLabels`, `ready.excludeLabels`, `branch.base`, `branch.pattern`,
  `release.subject`. psk knows no project's labels: a project keeps its own containers
  out of Building by listing their label under `ready.excludeLabels`.
- doctor runs one scope per command, checks the spec template exists, and names the
  transition ids that are missing among the three psk moves.

### Changed

- land asks for confirmation before the squash-merge, the one step that cannot be
  taken back, after showing the version, the review outcome and any skipped skill.

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
