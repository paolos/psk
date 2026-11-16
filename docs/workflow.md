# psk workflow

The lifecycle every psk command follows. Configuration — layers, the floor, keys —
is in [`config.md`](config.md).

## The lifecycle

```
Backlog ──/psk:spec──▶ Speccing ──/psk:ready──▶ Building ──/psk:dev──▶ PR ──/psk:land──▶ Shipping ──▶ Done
                          ▲                                    │
                          └──────── the spec was wrong ────────┘
```

| Command | Moves the ticket | Leaves behind |
|---|---|---|
| `/psk:spec` | Backlog → Speccing | the spec, in the ticket's description |
| `/psk:ready` | Speccing → Building | nothing, or the list of what is missing |
| `/psk:dev` | stays in Building | a branch and an open PR |
| `/psk:land` | Building → Shipping | a squash-merge on the base branch, carrying the version |

Shipping → Done happens at **release**, not at merge: the merge produces a version,
the release delivers it.

Each move uses the transition id recorded under `jira.transitions`, never a name:
transition names rarely match status names.

## The tracker

psk owns the lifecycle; a tracker holds the tickets. Jira and GitHub issues are both
supported, and `docs/trackers.md` is the one place that says what each state, each move and
each lookup means on each of them. Every other document here speaks psk's vocabulary.

## Where work comes from

`/psk:new` turns a report or an idea into a ticket: it grills the request — is this one
thing, how would anyone know it is done — looks at what the description touches, writes it
in the project's shape, and creates it in Backlog on the user's confirmation. Nothing else
in psk creates tickets, and nothing downstream works without one.

## The unit

**One ticket, one branch, one PR — always.** A ticket is taken in charge by
`/psk:dev`, which opens a branch for it; the branch ends in a pull request, and the
pull request lands through `/psk:land`. There is no other path to the base branch.

A project that keeps tickets which should never be built — containers, epics, speccing
groups — lists their labels under `ready.excludeLabels`. A project where only marked
tickets are built states the mark under `ready.requireLabels`, and a ticket without it
is refused. psk does not know what those labels mean; it only decides which tickets
reach Building.

## The preflight

Every command starts with

```sh
node scripts/doctor.mjs --scope=<command> --json
```

and stops on any failure, before touching Jira or git. A land that finds its review
skill missing stops at the first step, not halfway through a rebase.

## The gate

`/psk:ready` is the one command with no slots: its checks are the contract, and a gate
that behaves differently depending on the installed tools is no longer a gate. It
passes a ticket whole or refuses it with the list of what is missing. There is no
partial pass.

## Going back

When `/psk:dev` finds the spec wrong — a missing case, a contract that does not hold,
an assumption the code contradicts — it stops, comments on the ticket what is wrong
and why, and moves the ticket back to Speccing. A wrong spec is fixed in the spec, then
built again; it is not patched over inside the PR.

## Version and changelog

- `/psk:dev` writes the change's entry under `## [Unreleased]` in the file named by
  `release.changelog`, while it knows the work. It leaves the version alone.
- `/psk:land` rebases onto the base branch, runs `release.bump`, and promotes the
  `## [Unreleased]` entries to `## [X.Y.Z] - <date>`, dated the day it lands.

The version is assigned after the rebase, against the base branch as it actually is:
two PRs open in parallel never claim the same number, and the version appears on a
branch only at the moment it becomes true.

## Land order

1. rebase onto the base branch — `land.conflicts` if it conflicts
2. `land.cleanup`
3. `land.review`, on the final diff
4. the project's `checks`
5. `release.bump`, and the changelog promotion
6. squash-merge

Cleanup runs before review because a cleanup edits code: after the review, its edits
would reach the base branch unreviewed. **The reviewed diff is the diff that merges.**

## The spec

A spec follows the project's template when `spec.template` names one — per kind, or one
file for everything. Without it, psk writes the shape bundled in `templates/`:

- `templates/feature.md` — **What · Impact · Open Points · Verification**
- `templates/bug.md` — **Symptom · Diagnosis · Fix · Open Points · Verification**

They are the floor, not a preference: a project with a shape of its own points
`spec.template` at it and psk uses that instead, including its headings and its language.
A bug and a feature take different shapes because they are read by different people — a
reporter checks the symptom, a builder reads the diagnosis.

The spec sits **below the reporter's original description**, kept on top under
`## Original message:` exactly as written, images and videos included: whoever specs a
ticket is often not whoever reported it. It is written in the **ticket's language**; with
the bundled templates, their headings are translated too.

An open point is closed by editing its entry — struck through, with the answer beside
it — never by deleting it: the spec shows what was decided, not only what is left.
When a comment corrects the spec, the correction goes into the description; a spec
that is right only in its comments states the wrong thing to whoever reads it next.
