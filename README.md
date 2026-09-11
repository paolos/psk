# psk

A Jira-integrated delivery workflow for Claude Code, as a plugin.

The **phases** are fixed: a ticket is specified, passes a readiness gate, is built on a
branch, and lands through a pull request. The **tools inside each phase** are not:
which skill drives the implementation, which ones review the diff, which one checks
the app on a device — each is a slot, filled from the skills installed on the machine.

| Command | Does |
|---|---|
| `/psk:setup` | Configure psk for a repository: Jira, project conventions, the skills in each slot |
| `/psk:doctor` | Check the repository, psk, the skills and Jira; name the fix for each problem |
| `/psk:spec` | Write the spec into the ticket; Backlog → Speccing |
| `/psk:ready` | The gate: pass a ticket whole, or refuse it with the list; Speccing → Building |
| `/psk:dev` | Build one ticket of yours on its own branch, ending in an open PR |
| `/psk:land` | Rebase, clean up, review the final diff, cut the version, squash-merge; → Shipping |

One ticket, one branch, one PR — always. The lifecycle and its rules are in
[`docs/workflow.md`](docs/workflow.md).

## Install

The repository is its own marketplace:

```
/plugin marketplace add C:/projects/mine/psk
/plugin install psk@psk
```

Then, in a project: `/psk:setup`, and `/psk:doctor` to confirm.

## Configuration

Three layers — user, project, local — merged with a floor: a guarantee can be added
from any layer and removed from none. See [`docs/config.md`](docs/config.md).

## Development

```
npm test          # the merge rules, with node:test — no dependencies
node scripts/doctor.mjs            # run from inside any project
node scripts/config.mjs resolve --show-origin
```
