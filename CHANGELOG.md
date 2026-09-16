# Changelog

## [0.6.0] - 2026-09-16

### Added

- **GitHub issues as a tracker, beside Jira.** `tracker.kind` picks one; `docs/trackers.md`
  is the single place that says what each psk state, move and lookup means on each. On
  GitHub the state is a **label** by convention " — `status:speccing` and the rest " — because an
  issue has only open and closed: psk keeps one at a time, since GitHub will not. Projects
  v2 was not used: it needs a project created and linked, its issues added to it, the
  `project` scope on every machine and opaque node ids in the config, where a label needs
  none of that. Projects classic, the board that used to come with a repository, was retired
  " — its API answers 404.
- **doctor checks the tracker, whichever it is**: on GitHub it reads the repository's labels
  and names the ones missing, with the `gh label create` that makes them.

### Changed

- **The skills speak psk's vocabulary, not Jira's.** "Move it to Building" instead of a
  transition id; "assigned to you" instead of an account id. The mapping lives in one file.
- **`/psk:ready` cannot demand an estimate a tracker has no field for**: on GitHub it says so
  and moves on, rather than failing a check nobody can pass.
- **A land on GitHub never writes `Closes #n`** in the pull request: GitHub would close the
  ticket at merge, and in psk a merged ticket is in Shipping " — the release is still ahead.

## [0.5.0] - 2026-09-16

### Added

- **`/psk:help` — what to do now, not what exists.** It reads the current branch, its ticket
  and that ticket's status, then names the single next command with the key already in it; the
  guide underneath is derived from this project's configuration, so "what happens when I run
  land" names the skills actually in the slots. A fixed list of commands goes stale and nobody
  rereads it — the state of the work changes every day, and that is what this reads.

## [0.4.0] - 2026-09-16

### Added

- **`/psk:new` — the way work enters psk.** It takes a report or an idea, grills the request
  (is this one thing? how would anyone know it is done? for a bug: which steps, which version,
  always or sometimes?), reads what the description touches without changing a line, writes it
  in the project's shape and creates the ticket in Backlog on confirmation. Nothing in psk
  created tickets until now, so every ticket was written by hand outside the workflow it then
  had to pass through.
- **Bundled spec shapes, one per kind** — `templates/feature.md` (What · Impact · Open Points ·
  Verification) and `templates/bug.md` (Symptom · Diagnosis · Fix · Open Points · Verification).
  The default shape used to live as prose in `docs/workflow.md`, which meant a project could
  point `spec.template` at its own file and the two would drift apart with nothing to compare.
- **`jira.issueTypes`** — what a project calls a bug and a piece of work, so `/psk:new` can
  create the right kind. Asked by `/psk:setup`.

### Changed

- **`spec.template` takes one file per kind**, `{ "feature": …, "bug": … }`, and still accepts a
  single path meaning "for everything".
- **`/psk:spec` writes a diagnosis for a bug**, not a design: it runs the `dev.bugfix` skills to
  reproduce and locate the fault, cites file and line, says whether it is a regression and since
  when — and changes no code, because a diagnosis written while fixing records the fix instead
  of the cause.

## [0.3.0] - 2026-09-16

### Changed

- **Land stops rewriting history when the repository squash-merges.** It merges the base
  into the branch instead of rebasing onto it, and pushes plainly. The squash discards the
  branch's history either way, so the rebase bought a tidy history nobody would ever read,
  at the price of the one command in a land that can destroy a teammate's work. A repository
  that does not squash-merge still rebases, and now pushes with `--force-if-includes`
  alongside `--force-with-lease`.
- **The version bump takes the level the work calls for**: patch for a bug, minor otherwise,
  read off the ticket's issue type and shown in the summary before the merge. It was always
  whatever `release.bump` defaulted to, which left the real convention in each session's head.
- **Nothing after the merge can fail a land.** The steps that follow it are a report: the
  work is already on the base branch, and an error there only confuses.

### Added

- **doctor reports landed branches still sitting in the local repository** — upstream gone,
  which is what a squash-merged branch looks like once land deleted it on the remote. They
  accumulate one per ticket because `git branch -d` refuses them, and nothing else notices.
  `/psk:dev` now deletes the one it starts from.

## [0.2.8] - 2026-09-15

### Changed

- **`/psk:dev` clears the branch it came from.** A worktree manager creates a branch before
  psk runs; psk now branches as usual and then deletes that one, so a ticket does not leave a
  dead branch behind. It is deleted only when it carries no commits of its own — a branch with
  work on it is kept and named in the report. Supersedes 0.2.7's rule of keeping it, which
  traded one kind of clutter for another: the psk branch naming stops applying.

## [0.2.7] - 2026-09-15

### Fixed

- **A land no longer fails on a repository that uses worktrees.** The squash-merge dropped
  its `--delete-branch` flag, which makes the client jump to the base branch once the merge
  is through: with the base checked out in another worktree that fails *after* the merge, so
  a land that succeeded reported an error. The branch is now deleted on the remote as its own
  step, and the base branch is updated only where it is checked out — elsewhere land says
  where to pull it instead.

### Changed

- **`/psk:dev` keeps the branch the checkout is already on.** A worktree manager creates the
  branch before psk runs; creating a second one for the same ticket left an unused branch per
  ticket. psk now branches from the base only when the checkout is actually on the base.

## [0.2.6] - 2026-09-14

### Changed

- **`/psk:spec` with no key lists your tickets instead of asking for one.** It shows what
  is assigned to you in Backlog or Speccing — where a spec starts, and where it comes back
  to be sharpened — and you pick, one or several. `/psk:dev` already listed; asking the
  user to recall a key from memory was work the command can do itself.

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
