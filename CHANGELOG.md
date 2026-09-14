# Changelog

## [0.2.5] - 2026-09-14

### Added

- **`ready.requireLabels`: build only what the project has marked.** The mirror of
  `excludeLabels`, and the better half of the pair for a project that labels the tickets
  it intends to build: `/psk:ready` gains a check of its own and `/psk:dev` refuses, at
  preflight, a ticket missing any required label. A project states what it builds or what
  it does not — the same statement, said once.

## [0.2.4] - 2026-09-11

### Changed

- **Re-running `/psk:setup` asks what to change.** With a project layer already in
  place, setup shows the current configuration — each value with the layer it comes
  from — and what doctor flags, then asks which sections to change (Jira, project
  conventions, slots, or nothing) instead of walking every section again. A section
  name passed as argument (`/psk:setup slots`) goes straight to it. "Nothing" with a
  clean doctor writes nothing; the drafts show only the files the chosen sections
  touch.

## [0.2.3] - 2026-09-11

### Fixed

- **An unprotected default branch no longer stops a land.** It stays a failure in
  `/psk:doctor`, where the advice is to protect it, and becomes a warning in the land
  preflight: land reaches the branch through a pull request either way, so it does not
  depend on protection. Blocking every land on a repository setting only an admin can
  change made psk unusable on most repositories. The verdict is a pure function,
  `protectionVerdict`, with its own tests.

## [0.2.2] - 2026-09-11

### Added

- **doctor reports the psk version, and catches a stale session.** The first line of
  the psk group names the version running and the one installed, with its scope and
  commit. When the session still runs an older cached copy after an update — the
  skills of one version driving the scripts of the same old version — it warns and
  points to `/reload-plugins`. A copy run from a checkout is reported as such, not as
  a problem. The verdict is a pure function, `versionVerdict`, with tests for each
  case, including path comparison across Windows case and separators.

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
