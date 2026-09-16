---
name: help
description: Where you are in the psk workflow and which command comes next, plus what each command does with this project's configuration. Pass a command name for just that one.
disable-model-invocation: true
---

# psk help

Answers **"what do I do now"** before "what exists". A list of commands goes stale and
nobody rereads it; the state of the work changes every day, and that is what this reads.

The lifecycle is in `docs/workflow.md`, two levels above this skill's base directory, and
the configuration rules in `docs/config.md` beside it.

## 1. Read the state

```sh
node "<base>/../../scripts/config.mjs" resolve --json
```

Then, without changing anything:

- the current branch, and whether it carries a ticket key;
- an open pull request for it, if any;
- that ticket in Jira: status, assignee, labels;
- with no ticket in sight, the tickets in `jira.project` assigned to `jira.accountId`
  that are in Speccing or Building.

A command name passed as argument skips all of this: go to step 3.

Done when you know which ticket, if any, this checkout is about.

## 2. Say where they are, and what comes next

Open with the state in one or two sentences — the ticket, its status, the branch, the
open PR — and then **the single next command**, with the ticket key already in it.

The map, for deciding which one that is:

| State | Next |
| --- | --- |
| A report or an idea, no ticket | `/psk:new "<description>"` |
| Ticket in Backlog | `/psk:spec <key>` |
| Ticket in Speccing | `/psk:ready <key>` — it will refuse and list what is missing, which is the useful answer |
| Ticket in Building, no branch yet | `/psk:dev <key>` |
| On a branch with an open PR | `/psk:land <pr>` |
| Ticket in Shipping | nothing: it reaches Done at release |
| Nothing configured | `/psk:setup` |

When the state is ambiguous — several tickets of theirs in Building, a branch whose
ticket is in Speccing — say so and name the two commands that resolve it, rather than
guessing which one they meant.

Done when the user has one command to run.

## 3. Then the guide, from this project's configuration

Short, and **derived** — a help that restates the README drifts from it. For each
command name the skills that fill its slots **in this project**, so the answer to "what
happens when I run land" names `simplify` and `code-review` rather than "the cleanup
and review skills".

For a single command asked by name, give that one in full: what it does, what it needs
before it runs, which slots it uses, and what it leaves behind.

Close with what psk deliberately does not do, because it is the part people trip on:

- it never touches a checkout other than the current one, never updates the base branch
  locally, and does not know what a worktree is;
- it creates no ticket outside `/psk:new`, and moves no ticket to Done — a release does
  that;
- every command is invoked by the user: psk does nothing on its own.
