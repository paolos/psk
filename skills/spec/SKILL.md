---
name: spec
description: Write or refine the spec of one or more Jira tickets, in the ticket itself, and move them to Speccing. Pass the ticket keys, or none to choose from yours.
disable-model-invocation: true
---

# psk spec

Turns a ticket into something `/psk:ready` can pass: a spec in the ticket's
description, with every open question owned. The lifecycle rules and the default spec
shape are in `docs/workflow.md`, two levels above this skill's base directory; the
configuration in `docs/config.md`. Read both before step 2.

## 1. Preflight

```sh
node "<base>/../../scripts/doctor.mjs" --scope=spec --json
node "<base>/../../scripts/config.mjs" resolve --json
```

Stop on any failure and report it. Then take the ticket keys the user passed. With
none, list the tickets in the project assigned to you whose state is
Backlog or Speccing — where a spec starts, and where it comes back to be sharpened —
and ask which. With several, the spec is one document covering all of them: it goes on
the first key, and names the others.

Done when the preflight passes and you hold the keys.

## 2. Gather

For each ticket, read from Jira its description, comments, links and labels. Then read
what the ticket touches in the code — the screens, the API calls, the tests — and any
reference implementation the project names. Run the skills in slot `spec.research`
when the spec depends on facts you do not yet hold.

Every claim the spec makes about current behaviour cites a file and line, so a later
reader can check whether it still holds.

Done when each part of the ticket maps to code you have read, or to a question you
cannot answer from the code.

## 3. Write

Write in the shape for **this ticket's kind**, resolved in this order: `spec.template`
for the kind (`spec.template.bug` / `spec.template.feature`), then `spec.template` when
it names one file for everything, then the bundled `templates/bug.md` or
`templates/feature.md` two levels above this skill's base directory. See `docs/config.md`.

**Write in the language of the ticket**, the one its original description is written in.
With a bundled template, translate its headings too (an Italian bug is **Sintomo · Diagnosi
· Correzione · Punti aperti · Verifica**); code, paths and identifiers stay as they are. A
project template keeps its own headings: the project chose them.

**For a bug the spec is a diagnosis.** Run the skills in slot `dev.bugfix` to reproduce
it and find where it comes from, and write that down with file and line. Two rules bind
this: **change no code** — the fix is `/psk:dev`'s, and a diagnosis written while fixing
records the fix instead of the cause — and say plainly whether it is a regression, and
since when.

For anything else, split what the team can start on its own from what waits on someone
else's answer — that split is what the spec is for.

Every question you could not settle becomes an open point with an **owner** and what
it **blocks**. A question with no owner is a wish, not an open point.

Run the skills in slot `spec.challenge` on the draft, and fold what they find into the
spec.

Done when every section of the shape is present and every open point has an owner and
a stated consequence.

## 4. Record

Show the user the spec. Once approved, write it into the ticket's description **below
the original**, never in its place. The first time, the description becomes:

```
## Original message:
<the description as the reporter wrote it, untouched: text, images, videos>
---
<the spec>
```

Whoever specs a ticket is often not whoever reported it: the reporter must still find
their own words, and their screenshots, in their ticket. When a description already holds
a spec, leave the `Original message:` block as it is and update the spec in place,
closing answered open points by striking them through with the answer beside them.

**Never write a description that drops what the original embeds.** On Jira the MCP reads
and writes the description as markdown, and an embedded image or video comes back as a
`blob:` link that cannot be written back. When the original has one, write the description
through the Jira REST API in ADF instead, prepending the original's nodes as they are
(`docs/trackers.md`); without credentials for it, stop and tell the user rather than
write the description without its media.

Move a ticket in Backlog to Speccing (`docs/trackers.md`).

Report the tickets written, the open points still open with their owners, and whether
the spec looks ready for `/psk:ready`.
