---
name: doctor
description: Check that this repository, psk, its skills and Jira are ready for the psk workflow, and name the fix for each problem.
disable-model-invocation: true
---

# psk doctor

A read-only health check: it reports and names the fix; `/psk:setup` applies fixes.
The scripts it runs live in `scripts/`, two levels above this skill's base directory,
and the configuration rules in `docs/config.md` beside them.

## 1. Run the deterministic checks

```sh
node "<base>/../../scripts/doctor.mjs" --json
```

Run it from the project root. It covers everything a script can establish: the
repository and GitHub (protection of the default branch, squash merge), whether psk is
initialised, the merged configuration, `.gitignore`, and where each configured skill
comes from. Add `--run-checks` when the user asked to run the project's own checks.

Done when you hold the JSON: `checks` and `toConfirm`.

## 2. Confirm skills against the session

A script sees skills on disk; only you see which are loaded in this session, and a
skill installed on disk can still be absent from it. For every configured skill —
each entry under `effective.slots` and each item in `toConfirm` — look it up in the
skill list available to you now.

- Loaded → keep the script's verdict.
- In `toConfirm` and loaded → it is a built-in; mark it pass.
- Not loaded → **fail** if its slot is required, **warn** if not.

Done when every configured skill carries a verdict of its own.

## 3. Check Jira live

With the Atlassian tools, against the `jira` section of the merged config:

- the site for `jira.cloudId` is reachable;
- project `jira.project` exists and returns issues;
- every id under `jira.transitions` is still a transition in that project's workflow —
  read the transitions of one of its issues and compare the ids; workflows get edited,
  and a stale id turns a status change into a silent failure;
- `jira.accountId`, if set, resolves to the current user.

With no `jira` section, record one warn pointing to `/psk:setup` and move on.

Done when each of the four has a verdict, or the section is absent.

## 4. Report

Open with the psk version line. When it says the session runs an older copy than the
one installed, lead with that: every other line of the report came from the older
copy's scripts, so it may describe a bug the installed version already fixed.

Then one list grouped as the script groups it — repository, psk, skills, jira,
project — failures first within each group, each with its fix on the line below. Close with the
counts, then the single next action: `/psk:setup` when psk is not initialised, else the
first failure.

Done when every check has a status and every failure has a next action.
