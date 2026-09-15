---
name: land
description: Close a pull request the psk way — rebase, clean up, review the final diff, cut the version, squash-merge, move the ticket to Shipping. Pass the PR number.
disable-model-invocation: true
---

# psk land

The only path to the base branch. It runs in a fixed order, and the order is the
point: **the reviewed diff is the diff that merges**. The order and the version rules
are in `docs/workflow.md`, two levels above this skill's base directory.

## 1. Preflight

```sh
node "<base>/../../scripts/doctor.mjs" --scope=land --json
node "<base>/../../scripts/config.mjs" resolve --json
```

Stop on any failure. Then confirm against the session's skill list that every skill in
the `land.*` slots is loaded. A missing skill in a required slot stops the land here,
before anything is touched; a missing optional one is skipped and recorded.

Read the pull request — the number given, or the one open for the current branch. It
is open, targets `branch.base`, and its title or branch carries a ticket key whose
ticket is in Building.

Done when the preflight passes and you hold the PR, its branch and its ticket.

## 2. Rebase

Fetch and rebase the branch onto `origin/<branch.base>`. Resolve conflicts with the
skills in slot `land.conflicts`. With conflicts and no skill in that slot, stop and
report them.

Done when the branch sits on the current base with no conflict.

## 3. Clean up

Run the skills in slot `land.cleanup` on the branch's diff, and commit what they
change. Cleanup comes before review because it edits code.

Done when the cleanup skills have run and their changes are committed.

## 4. Review

Run the skills in slot `land.review` on the final diff, `origin/<branch.base>...HEAD`.
Fix what they find that blocks the merge, then review again: a fix is code, and code
that merges is reviewed. When a finding has no clear fix, stop and report it.

Done when the last review of the final diff raises nothing blocking.

## 5. Check

Run the project's `checks`. A failure stops the land.

## 6. Cut the version

Run `release.bump`. In `release.changelog`, turn `## [Unreleased]` into
`## [X.Y.Z] - <today>`, dated the day it lands. When the section is missing, write the
entry from the PR description and say so in the report. Commit as
`chore(release): vX.Y.Z` and push with `--force-with-lease`.

Done when the branch carries the new version and its dated changelog entry.

## 7. Merge

Show the user what is about to land: the version, the review outcome, the checks, any
skipped optional skill. Merge on their confirmation — it is the one step in psk that
cannot be taken back.

Squash-merge with the subject from `release.subject`. **Delete the branch as a step of
its own, on the remote** (`git push origin --delete <branch>`), rather than with the
merge command's delete flag: that flag makes the client move the local checkout to the
base branch, which fails when the base is checked out in another worktree — after the
merge has already happened, leaving a land that reports failure on work that landed.

Move the ticket to Shipping with `jira.transitions.shipping`, and comment on it the
version, the merge commit, a line on the review, and any skipped skill.

Then update the base branch, worktree-aware: update it in place when this checkout is
on it, and otherwise leave it alone and say where it is checked out, so the user pulls
it there. A base branch checked out elsewhere cannot be fetched into, and the land must
not end on an error for a housekeeping step.

Report the merge commit, the version, and any branch or checkout left for the user to
clean up. The ticket reaches Done at release.
