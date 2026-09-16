---
name: new
description: Turn a report or an idea into a Jira ticket worth building — grilled first, written in the project's shape, created on your confirmation. Pass the description, or none to be asked.
disable-model-invocation: true
---

# psk new

The way work enters psk. Everything downstream — `/psk:spec`, `/psk:ready`, `/psk:dev` —
assumes a ticket exists and says something; this is where that happens. The lifecycle is
in `docs/workflow.md`, two levels above this skill's base directory.

## 1. Preflight

```sh
node "<base>/../../scripts/doctor.mjs" --scope=spec --json
node "<base>/../../scripts/config.mjs" resolve --json
```

Stop on any failure. Take the description the user passed; with none, ask what happened
or what they want.

Decide **which kind** it is and say so: a **bug** is something that already behaves
wrong, anything else is work to do. When the description could be either — "the totals
look off" — ask, because the two are written differently and read by different people.

Done when the preflight passes and you hold a description and its kind.

## 2. Grill the request

Run the skills in slot `spec.challenge` on the description.

**Here they attack the request, not the design.** `/psk:spec` will stress-test how the
thing should be built; this step stress-tests whether it is one thing at all:

- Is this one ticket, or three wearing one coat?
- How will anyone know it is finished?
- For a bug: what are the exact steps, on which version, every time or sometimes? What
  did the person expect instead, and why did they expect it?
- Who else is affected — is this one person's setup, or everyone's?

Fold the answers in. What the user cannot answer becomes an open point with an owner,
not a gap to be discovered by whoever builds it.

Done when the description says one thing, and says how you would know it is done.

## 3. Look, before writing

Read what the description touches in the code: the screen, the call, the module. Enough
to write a ticket someone can pick up — **not** enough to solve it. Cite a file and line
when you name current behaviour.

For a bug this is where the report becomes checkable: confirm it can happen at all, and
say so. A bug nobody can locate is still a valid ticket; a bug the code contradicts is a
misunderstanding, and saying that now is worth more than a ticket.

**Change nothing.** No file is edited by this command, ever — the fix belongs to
`/psk:dev`, and the design to `/psk:spec`.

Done when every claim in the draft is either cited or marked as unverified.

## 4. Show, then create

Write the draft in the project's shape: `spec.template` for its kind — see
`docs/config.md` — or the bundled `templates/bug.md` / `templates/feature.md` otherwise.
A ticket born in the same shape it will be specced in does not have to be rewritten
later.

Show the user the summary and the description in full. On their confirmation, create the
ticket (`docs/trackers.md`):

- **issue type** for its kind — an issue type on Jira, a label on GitHub;
- **assignee** you, unless the user names someone else;
- **status** left in Backlog. `/psk:spec` is what takes a ticket to Speccing, and a
  ticket that lands in Speccing without a spec makes `/psk:ready` lie.

Report the key, the URL, and the next command: `/psk:spec <key>`.
