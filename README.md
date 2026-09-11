# psk

A Jira-integrated delivery workflow for Claude Code, as a plugin.

The **phases** are fixed: a ticket is specified, passes a readiness gate, is built on a
branch, and lands through a pull request. The **tools inside each phase** are not:
which skill drives the implementation, which ones review the diff, which one checks
the app on a device — each is a slot, filled from the skills installed on the machine.

| Command | Does |
|---|---|
| `/psk:setup` | Configure psk for a repository: Jira, project commands, one skill per slot |
| `/psk:doctor` | Check the repository, psk, the skills and Jira; name the fix for each problem |

`spec`, `ready`, `dev` and `land` follow.

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
