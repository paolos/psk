---
name: spec
description: Write or refine the spec of one or more Jira tickets, in the ticket itself, and move them to Speccing. Pass the ticket keys.
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

Stop on any failure and report it. Then take the ticket keys the user passed; with
none, ask for them. With several, the spec is one document covering all of them: it
goes on the first key, and names the others.

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

Use `spec.template` when the project names one, the default shape in `workflow.md`
otherwise. Split what the app team can start on its own from what waits on someone
else's answer — that split is what the spec is for.

Every question you could not settle becomes an open point with an **owner** and what
it **blocks**. A question with no owner is a wish, not an open point.

Run the skills in slot `spec.challenge` on the draft, and fold what they find into the
spec.

Done when every section of the shape is present and every open point has an owner and
a stated consequence.

## 4. Record

Show the user the spec. Once approved, write it into the ticket's description; when a
description already holds a spec, update it in place, closing answered open points by
striking them through with the answer beside them. Move a ticket in Backlog to
Speccing with `jira.transitions.speccing`.

Report the tickets written, the open points still open with their owners, and whether
the spec looks ready for `/psk:ready`.
