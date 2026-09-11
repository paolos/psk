# psk configuration

The reference every psk skill points at. The slot catalogue and the merged result
are not written here — they come from the scripts, which are the source of truth:

```sh
node scripts/config.mjs slots                  # the slot catalogue
node scripts/config.mjs resolve --show-origin  # the merged config, and where each value came from
node scripts/skills.mjs                        # where every installed skill comes from
```

## Layers

Three files, merged lowest to highest — the same shape as Claude Code's own
`settings.json`:

| Layer | File | Committed | Holds |
|---|---|---|---|
| `user` | `~/.claude/psk.json` | — | who you are: your Jira account, personal defaults across every repository |
| `project` | `.claude/psk.json` | **yes** | the team contract: Jira coordinates, slots, project commands |
| `local` | `.claude/psk.local.json` | **no** | this machine: skills that only run here |

`local` exists for the **per-machine** slot. `dev.verify` is the case: a simulator
skill runs on the Mac and cannot run on Windows, so putting it in the committed file
would stop `/psk:dev` on every machine that lacks a simulator. `.claude/psk.local.json`
has to be in `.gitignore` before it is created.

## The floor

Ordinary keys merge by precedence: a higher layer wins, arrays replace. Slots add one
rule, the **floor**: a guarantee can be added from any layer and removed from none.

- A slot any layer marks `required` stays required. A layer that sets it `false`
  afterwards gets a warning, and the slot stays required.
- A required slot takes the **union** of every layer's skills, project first. A
  personal file can add a second reviewer; it cannot remove the team's.
- An ordinary slot takes the skills of the highest layer that names any.
- A **waiver** — `"waived": "<reason>"` on a required slot left empty — counts only in
  the project layer, where the team can see it in review.

Without the floor, the team contract would hold until the first person overrode it on
their own machine.

## Keys

```jsonc
{
  "version": 1,

  "jira": {
    "cloudId": "…",               // project
    "project": "ILLIRIA",         // project
    "board": 803,                 // project
    "accountId": "…",             // user — who "assigned to me" means
    "transitions": {              // project — ids, not names: names differ per workflow
      "speccing": "2", "building": "4", "shipping": "5", "done": "6", "backlog": "7"
    }
  },

  "release": {
    "bump": "bun run version:bump",   // what land runs to cut the version
    "changelog": "CHANGELOG.md"
  },

  "checks": ["bun run check:env", "bun run test"],   // run by doctor --run-checks

  "slots": {
    "land.review": {
      "required": true,
      "skills": [{ "name": "code-review", "args": "high" }, "mattpocock-skills:code-review"]
    }
  }
}
```

A skill is a bare name or `{ "name", "args" }`. A plugin skill is written with its
namespace: `mattpocock-skills:tdd`.

## Rules no config field states

- **`land.cleanup` runs before `land.review`.** A cleanup skill edits code; after the
  review, its edits would reach main unreviewed. The reviewed diff is the diff that
  merges.
- **A missing required skill stops the command.** A land that skips its review in
  silence is worse than no land. A missing optional skill is skipped, and the skip is
  written into the PR body.
- **`code-review ultra` is never a step.** It is billed and launched by the user;
  the config refuses it.
- **The plugin defines the phases; the project fills in the tools** — skills in slots,
  commands in `release` and `checks`. Nothing in psk knows it is running on one
  particular repository.
