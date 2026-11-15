# Tasks

The live backlog is one markdown file per project at
`~/.onepersonco/<project>/backlog.md`; canceled and older done tasks live in
`backlog.archive.jsonl` beside it. Both are written only through `opc task` or
the console — never edited or committed.

## Read

```sh
opc task list gymbloc              # live tasks, grouped by section
opc task list gymbloc --all        # include archived history
opc task list gymbloc --section Canceled
opc task list gymbloc --json       # for scripts
opc task show GYM-142              # searches live and archive
opc task prompt GYM-142 | pbcopy   # copy the kickoff prompt into a new session
opc task search gymbloc "keyboard" # titles/descriptions, live and archive
```

IDs are `KEY-N` (`GYM-142`): assigned on add, stable, never reused. Cite the ID
in the branch (`feat/GYM-142-rest-timer`) and the PR body (`Task: GYM-142`).

## Create and move

Every task gets a kickoff prompt when it is filed: write
`prompts/<date>-<slug>/TASK.md` (problem, what to read, `/opc-delegate` first if
it should be orchestrated; never the solution or a model) and attach it with
`--prompt`. Model advice for the owner goes in `--desc` (`Run: …`). Rules: the
backlog block, "Kickoff prompts"; `opc check` warns when one is missing.

```sh
opc task add gymbloc "Rest timer between sets" --priority p1 \
  --spec docs/specs/rest-timer.md --prompt prompts/2026-10-20-rest-timer
opc task move GYM-142 Now --before GYM-140
opc task edit GYM-142 --prompt prompts/2026-10-20-rest-timer
opc task cancel GYM-143              # archived, not deleted
opc task restore GYM-143 --section Next
```

The project argument is the `id` from `projects.json`. `add` takes `--section`;
`add`/`edit` take `--priority p0..p3`, `--spec`, `--prompt`, `--desc` (`edit`
replaces them later, never the ID); `--before`, `--top`, `--end` place the move.
`restore` reopens a canceled or archived task with the same ID.

Done keeps the 25 most recent completions in `backlog.md`; older ones move to the
archive automatically on the next completion. `opc task trim gymbloc` enforces
the window on demand (normally unnecessary); `--keep N` archives the oldest
beyond N (`--keep 20` keeps twenty, `--keep 0` archives all Done tasks).

## After a merge

```sh
opc task done GYM-142 --pr https://github.com/…/pull/57
```

It stamps the date and is idempotent (`GYM-142 already done`; an archived task
answers `already done (archived)`). Leftover work becomes a new task with
`opc task add` — not a note or a follow-up branch.

Then clean the session:

```sh
opc task clean GYM-142          # dry run: prompt folder + matched worktrees
opc task clean GYM-142 --yes    # delete the prompt; remove clean merged worktrees
```

`--prompt archive` keeps the brief under `prompts/archive/`; `--prompt keep`
leaves it in place; `--no-worktrees` skips trees. Dirty or unmerged worktrees
are kept, and the prompt stays linked until they are resolved. The console’s
Done dialog and `remove files` button use the same operation.

## Console

The board uses the same writer: drag a card to move it, create from the dialog,
cancel from the drawer, or use the Done header's `clear` to archive every
visible done task (scoped to the active project filter; the CLI can restore
individual IDs). Moving a task to Done offers to clean its prompt/worktrees;
the Done drawer's `remove files` button does the same later. Projects without a
store are read-only with a hint.

## Legacy

Until a project is migrated, its `docs/backlog.md` is read-only and `opc check`
reports `backlog.legacy`; `opc task migrate gymbloc --key GYM` fixes that
(`--dry-run` previews). A project with no backlog at all starts from
`opc task init blocos --key BLO`.
