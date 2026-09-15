---
name: dev
description: Build one ticket in Building that is assigned to you — on its own branch, ending in an open pull request. Pass the ticket key, or none to choose.
disable-model-invocation: true
---

# psk dev

Takes one ticket through to an open pull request, and stops there: the merge belongs
to `/psk:land`. The lifecycle rules — the unit, going back, the changelog — are in
`docs/workflow.md`, two levels above this skill's base directory.

## 1. Choose the ticket

With a key, take it. With none, list the tickets in the project whose status is
Building and whose assignee is `jira.accountId`, and ask which.

Done when you hold exactly one ticket key.

## 2. Preflight

```sh
node "<base>/../../scripts/doctor.mjs" --scope=dev --json
node "<base>/../../scripts/config.mjs" resolve --json
```

Stop on any failure. Then confirm against the session's skill list that every skill in
the `dev.*` slots is loaded; a missing one in a required slot stops the command, a
missing optional one is skipped and named in the PR body.

Read the ticket and confirm it is in Building, assigned to `jira.accountId`, and
carries none of `ready.excludeLabels` and every one of `ready.requireLabels`. Anything else goes back to the user: moving a
ticket into Building is `/psk:ready`'s job, not this one's.

Done when the preflight passes and the ticket is confirmed.

## 3. Branch

Fetch. Note the branch the checkout is on before you touch anything. Then:

- **A branch for this key already exists** → the work is being resumed: switch to it.
- **Otherwise** → branch from `origin/<branch.base>` using `branch.pattern`: `{type}` is
  `fix` for a bug and `feat` otherwise, `{key}` the ticket key in lower case, `{slug}` a
  few words of the summary in lower-case ASCII joined by hyphens.

**Then clear the branch you came from.** A worktree manager creates a branch of its own
before psk ever runs, and it is left behind the moment psk branches: one dead branch per
ticket, outliving the work. Delete it once you have switched away — a checked-out branch
cannot be deleted, which is why this comes second — under both conditions:

- it is not `branch.base`, and
- **it carries no commits of its own**: it is an ancestor of `origin/<branch.base>`.

A branch with commits on it is somebody's work, not scaffolding: keep it, and say so.
Report either way — which branch you are on, and which you deleted.

Done when you are on the ticket's branch and nothing dead is left beside it.

## 4. Build

The spec in the ticket's description is the target. Build it with the skills in slot
`dev.method` — `dev.bugfix` instead when the ticket is a bug.

When the spec turns out wrong — a case it misses, a contract the code contradicts —
**go back**: stop building, comment on the ticket what is wrong and why, move it to
Speccing with `jira.transitions.speccing`, and report. The fix belongs in the spec.

Done when everything the spec asks for is built, or the ticket has gone back.

## 5. Verify

Run the project's `checks`, then the skills in slot `dev.verify`. A failing check is
fixed before moving on.

Done when every check passes and every verify skill has run or been noted as skipped.

## 6. Open the pull request

- Add the change's entry under `## [Unreleased]` in `release.changelog`, in the voice of
  the entries already there; create the heading above the first version when missing.
  Leave the version alone: it is cut at land.
- Commit, push, and open a pull request against `branch.base`, titled
  `type(scope): summary (KEY)`. The body says what changed, why, how it was verified,
  links the ticket, and names every optional skill that was skipped.
- Comment on the ticket with the PR link. The ticket stays in Building.

Report the PR, and that `/psk:land` is the next step.
