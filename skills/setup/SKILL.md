---
name: setup
description: Configure psk for this repository — Jira, project commands, and which installed skill fills each workflow slot. Run once per project; re-run to change a choice, optionally naming the section (jira, conventions, slots).
disable-model-invocation: true
---

# psk setup

Writes the three configuration layers psk reads. The layers, the floor, and the rules
behind them are in `docs/config.md`, two levels above this skill's base directory —
read it before step 2. The scripts are in `scripts/` beside it.

Prompt-driven, not a script: explore, choose what to change, ask one section at a
time, show the drafts, then write.

## 1. Explore

From the project root, run and keep the output of:

```sh
node "<base>/../../scripts/doctor.mjs" --json
node "<base>/../../scripts/config.mjs" resolve --json
node "<base>/../../scripts/config.mjs" slots --json
node "<base>/../../scripts/skills.mjs" --json
```

Then read what the scripts do not cover:

- the skill list loaded in **this session** — the only authority on which skills can
  run; a skill on disk can be absent from it;
- `package.json` scripts, or the project's equivalent: the candidates for
  `release.bump` and `checks`;
- `CLAUDE.md` or `AGENTS.md`: whether a `## psk` block already exists;
- with the Atlassian tools, the accessible sites.

Done when you know, for every slot in the catalogue, which session-loaded skills could
fill it, and whether this is a first run or a re-run.

## 2. Choose what to change

On a **first run** — no project layer yet — every section below is to be asked. Go to
step 3.

On a **re-run**, the configuration already works; the job is the change the user came
for. Show the current configuration as one compact summary, section by section — each
value with the layer it comes from (user, project, local) — followed by what doctor
flags. Then ask which sections to change, several allowed: **A. Jira**, **B. Project
conventions**, **C. Slots**, or **nothing**. When doctor flags a problem, recommend the
section that fixes it.

A section name passed as argument (`jira`, `conventions`, `slots`) is the answer: skip
the question and go straight to it.

**Nothing** with a clean doctor ends the run here: nothing is written. Nothing with a
failing doctor → report the failures and their fixes, and end.

Done when you hold the list of sections to ask.

## 3. Ask, one section at a time

Take the chosen sections in order, each as a question with the **recommended answer
first**, so the user can accept it in a word. On a re-run, show the section's current
values with their origin and ask only what the user wants to change within it; what
they keep stays as it is, in the layer it is in.

**A. Jira.** Site (`cloudId`), project key, board. Then the transition ids: read the
transitions of an issue in the project and map them onto `backlog`, `speccing`,
`building`, `shipping`, `done`. Transition names usually differ from status names —
`To Speccing` for the status Speccing is typical — so record ids and confirm the mapping
with the user. If one issue's transitions miss a state, read an issue in another
status. The current user's `accountId` goes to the **user** layer: it is who
"assigned to me" means, on every repository.

**B. Project conventions.** Propose each from what the repository already shows, and
ask the user to confirm:

- `release.bump`, `release.changelog`, `release.subject` — what land runs to cut a
  version, and the squash-merge subject. Read the recent history of the base branch:
  its merge subjects show the convention already in use. Confirm the bump command in
  particular, since it rewrites the version.
- `checks` — what doctor runs with `--run-checks`, from `package.json` or equivalent.
- `branch.base` and `branch.pattern` — the default branch, and the naming the existing
  branches already follow.
- `spec.template` — a spec template the project keeps, if any.
- `ready.requireEstimate`, `ready.blockingLabels`, `ready.excludeLabels`,
  `ready.requireLabels` — read the project's labels in Jira; labels marking blockers
  belong in `blockingLabels`, labels marking tickets that are never built (containers,
  epics) in `excludeLabels`, and the label a project puts on what it intends to build in
  `requireLabels`. A project that marks its work uses that one INSTEAD of the third:
  naming what is built and naming what is not are the same statement, said once.

**C. Slots.** For each slot in the catalogue, offer the session-loaded skills whose
description fits the slot's summary, the most direct fit first; the user picks none,
one, or several.

- **Say where each candidate comes from** (project, user, plugin, built-in). For a
  plugin skill, add that every teammate must install that plugin.
- **`land.review` is required by default.** Leaving it empty needs an explicit
  confirmation, recorded as a `waived` reason in the project layer.
- When two review skills are loaded and one checks correctness while the other checks
  conformance to the spec, recommend both: they answer different questions.
- `code-review` takes a level as `args`; recommend `high`. `ultra` is billed and
  user-launched, and the config refuses it.
- A **per-machine** slot (`dev.verify`) belongs in the local layer. Offer the skills
  that run on this machine.

Done when every chosen section has an answer and every slot asked has skills, an
explicit "none", or — for a required slot — a recorded waiver.

## 4. Show the drafts

Show every file that changes, in full, and let the user edit before anything is
written. On a re-run, only the files the chosen sections touch, with the changed keys
pointed out:

- `.claude/psk.json` — project layer: `version`, `jira` (without `accountId`),
  `release`, `checks`, the shared slots;
- `.claude/psk.local.json` — local layer, only when a per-machine slot was filled;
- `~/.claude/psk.json` — user layer: `jira.accountId`, merged into what is already
  there;
- `.gitignore` — the line `.claude/psk.local.json`, when missing;
- the `## psk` block for `CLAUDE.md` (or `AGENTS.md` when only that exists): one
  paragraph naming the two project files and listing the psk commands present in this
  version of the plugin — the `skills` array of its `plugin.json`.

Done when the user has approved each draft.

## 5. Write

Write the approved files. Update an existing `## psk` block in place; edit the
existing one of `CLAUDE.md` / `AGENTS.md` rather than creating the other. In every
layer, change only the keys this run set.

Leave the changes uncommitted: the project file is a team contract, and it reaches
main through a PR like any other change.

## 6. Verify

Run the doctor script again. Done when it reports no failure in the `psk` group. Report
what was written, what doctor still flags outside that group, and that the project
file is waiting to be committed.
