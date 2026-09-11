---
name: ready
description: The gate from Speccing to Building. Passes a ticket whole or refuses it with the list of what is missing. Pass the ticket key.
disable-model-invocation: true
---

# psk ready

The **gate**. It has no slots: its checks are the contract. It passes a ticket whole
and moves it to Building, or refuses it and moves nothing. The lifecycle is in
`docs/workflow.md`, two levels above this skill's base directory.

## 1. Preflight

```sh
node "<base>/../../scripts/doctor.mjs" --scope=ready --json
node "<base>/../../scripts/config.mjs" resolve --json
```

Stop on any failure. Then read the ticket from Jira: status, assignee, labels,
original estimate, description.

Done when the preflight passes and you hold the ticket.

## 2. Check

Apply every check. Record each as met or not met, with the evidence.

1. **Status** is Speccing.
2. **Assignee** is set — `/psk:dev` builds only tickets assigned to the person running it.
3. **Estimate** is set, when `ready.requireEstimate` is true.
4. **No excluded label**: none of `ready.excludeLabels`. These tickets are never built,
   whatever their state.
5. **No blocking label**: none of `ready.blockingLabels`.
6. **The spec is present**: every section of the spec shape — the project's
   `spec.template`, or the default in `workflow.md` — exists in the description and
   says something.
7. **No blocking open point**: every open point is closed, or states that it blocks
   nothing in this ticket. An open point that blocks the work is a reason to wait, not
   a detail to discover while building.

Done when all seven carry a verdict.

## 3. Decide

**All met** → move the ticket to Building with `jira.transitions.building`, and report
it passed.

**Any unmet** → move nothing. Report each unmet check with its evidence and the action
that would meet it — who has to answer which open point, which label is holding it.
The user decides whether to fix the ticket and run the gate again.

The gate has two outcomes and no third: a passed ticket, or a refused one with its
list.
