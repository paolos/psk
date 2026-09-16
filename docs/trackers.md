# Trackers

psk owns a lifecycle — **Backlog → Speccing → Building → Shipping → Done** — and a
tracker holds the tickets that move through it. Two are supported. Every skill speaks
psk's vocabulary; this file is the one place that says what each word means on each
tracker.

```json
"tracker": { "kind": "jira" }      // default when a "jira" section exists
"tracker": { "kind": "github", … } // see below
```

## The five operations

Everything psk does to a ticket is one of these. A skill names the operation; here is how
it is performed.

| Operation | Jira | GitHub |
| --- | --- | --- |
| **Read a ticket** | `getJiraIssue` | `gh issue view <n> --json title,body,labels,assignees,comments,state` |
| **Set its state** | `transitionJiraIssue` with the id under `jira.transitions` | swap the status label: remove the current one, add the new one — `gh issue edit <n> --remove-label … --add-label …` |
| **Comment** | `addOrEditJiraIssueComment` | `gh issue comment <n> --body …` |
| **Create** | `createJiraIssue` in `jira.project` | `gh issue create --title … --body … --label …` |
| **List mine in a state** | JQL on `assignee = jira.accountId` | `gh issue list --assignee <tracker.me> --label <state label>` |

## GitHub: the state is a label, by convention

GitHub issues have two states, open and closed. psk's five states therefore live in
**labels**, one at a time:

```json
"tracker": {
  "kind": "github",
  "repo": "owner/name",          // optional; the origin remote when absent
  "me": "<github login>",        // user layer, like jira.accountId
  "states": {
    "backlog":  "status:backlog",
    "speccing": "status:speccing",
    "building": "status:building",
    "shipping": "status:shipping"
  },
  "issueTypes": { "bug": "bug", "feature": "enhancement" }
}
```

**One state label at a time.** GitHub will not enforce it — nothing stops two from
coexisting — so psk does: setting a state removes the one that was there. A ticket found
with two is reported, not guessed at.

**`done` has no label.** A ticket reaches Done at release, which no psk command performs.
Close the issue then, or label it as the project prefers.

**Never write `Closes #123` in a pull request body.** GitHub would close the issue the
moment the PR merges, and in psk a merged ticket is in *Shipping*, not Done — the release
is still ahead of it. `/psk:land` sets the shipping label and leaves the issue open. This
is the one habit that quietly breaks the lifecycle, because it looks like good practice.

## What does not carry over

- **The estimate.** GitHub issues have no such field, so `ready.requireEstimate` cannot be
  met and `/psk:ready` says so plainly rather than failing a check nobody can satisfy. A
  project that wants estimates on GitHub keeps them in the body, and psk does not read
  them.
- **The key.** `ILLIRIA-111` on Jira, `#123` on GitHub. `branch.pattern` has to suit:
  `{type}/{key}-{slug}` yields `feat/123-…` on GitHub, so a project that wants the issue
  recognisable writes `{type}/issue-{key}-{slug}`.
- **Projects (v2).** A Status field would enforce single-state for us, but it needs a
  project created and linked, its issues added to it, the `project` OAuth scope on every
  machine, and opaque node ids in this file. Labels need none of that. Projects classic —
  the board that used to come with a repository — was retired by GitHub; its API answers
  404.
