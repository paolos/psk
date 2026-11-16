# Bug spec — the shape psk writes for a bug when the project names no template of its own

A bug's spec is a diagnosis. The report says what someone saw; the spec says where it
comes from, and what will change. A project that wants its own shape points
`spec.template` at a file of its own.

```markdown
## Symptom

What a person did, what they expected, what happened instead. How often, and on which
version. The reporter's own words are already on top, under `Original message:`: quote
them where they matter, since they saw it and you did not.

## Diagnosis

Where it comes from, citing **file and line**. Also what is *not* the cause, when you
ruled something out — the next reader will suspect it too.

Say plainly whether it is a regression, and since when. A bug that was always there and
one that arrived last week are two different conversations with whoever reported it.

## Fix

What changes, and what deliberately does not. When the cause sits outside this
repository, say who owns it and what the app can do meanwhile: shipping nothing is a
decision, but shipping a promise the code cannot keep is a defect of its own.

## Open Points

Numbered, each with an **owner** and **what it blocks**. Closed by striking the entry
through with its answer, never by deleting it.

## Verification

How you would know it is fixed — starting from the reporter's steps, which are the only
ones known to reproduce it. Name what only a real device, account, or machine can show.
```
