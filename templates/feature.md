# Feature spec — the shape psk writes when the project names no template of its own

Four headings, in this order. A project that wants its own shape points `spec.template`
at a file of its own; this one is the floor, not a preference.

```markdown
## What

Two or three sentences: what this is, and what it is not. When the spec covers several
tickets, list them here.

## Impact

What changes, and where — naming the file or the endpoint each part lands in. State what
changes, not what stays.

Split this in two when the project has a client and a backend (`Impatti UI` / `Impatti BE`
in an Italian project, UI / API elsewhere): the split is by **who can act**. The team can
start the first half without asking anyone; the second usually waits on someone else's
answer, and seeing which is which is the whole point of writing the spec before building.

Say which parts are **confirmed** and which are **assumed**.

## Open Points

Numbered. Every entry names an **owner** and says **what it blocks**. A question with no
owner is not an open point, it is a wish.

Close one by editing its entry — struck through, with the answer beside it — never by
deleting it: the spec shows what was decided, not only what is left.

## Verification

How you would know it works. Name anything only checkable on a real device, or in front
of real hardware: that is the part no estimate covers.
```
