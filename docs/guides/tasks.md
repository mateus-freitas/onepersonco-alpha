# Tasks

The backlog is one markdown file per project at `~/.onepersonco/<project>/backlog.md`,
written only through `opc task` or the console — never edited or committed.

## Read

```sh
opc task list gymbloc              # every task, grouped by section
opc task list gymbloc --json       # for scripts
opc task show GYM-142
```

IDs are `KEY-N` (`GYM-142`): assigned on add, stable, never reused. Cite the ID
in the branch (`feat/GYM-142-rest-timer`) and the PR body (`Task: GYM-142`).

## Create and move

```sh
opc task add gymbloc "Rest timer between sets" --priority p1 \
  --spec docs/specs/rest-timer.md
opc task move GYM-142 Now --before GYM-140
opc task edit GYM-142 --prompt prompts/2026-10-20-rest-timer
opc task cancel GYM-143
```

The project argument is the `id` from `projects.json`. `add` takes `--section`;
`add`/`edit` take `--priority p0..p3`, `--spec`, `--prompt`, `--desc` (`edit`
replaces them later, never the ID); `--before`, `--top`, `--end` place the move.

## After a merge

```sh
opc task done GYM-142 --pr https://github.com/…/pull/57
```

It stamps the date and is idempotent (`GYM-142 already done`). Leftover work
becomes a new task with `opc task add` — not a note or a follow-up branch.

## Console

The board uses the same writer: drag a card to move it, create from the dialog,
cancel from the drawer. Projects without a store are read-only with a hint.

## Legacy

Until a project is migrated, its `docs/backlog.md` is read-only and `opc check`
reports `backlog.legacy`; `opc task migrate gymbloc --key GYM` fixes that
(`--dry-run` previews). A project with no backlog at all starts from
`opc task init blocos --key BLO`.
