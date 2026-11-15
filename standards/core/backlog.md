<!-- opc-block: backlog -->

## Backlog

Task state is control-plane data: `~/.onepersonco/<project>/backlog.md`, owned by
`opc task`. It never lives in a project repo, branch, worktree, or PR diff, and
agents never edit it: read with `opc task list|show|search`, write with
`opc task add|edit|move|done|cancel|restore` (the console uses the same writer).
Sections: `## Now`, `## Next`, `## Later`, `## Done (recent)`.

Format, produced by the CLI and never hand-written:

```
- [ ] OPC-12 · Title — spec: docs/x.md — prompt: prompts/<folder> — p1
- [x] OPC-3 · Done thing — 2026-10-19
  D: optional description line
```

`OPC-12` is the task ID: assigned by `opc task add` (there is no `--id`), stable,
never reused — archived IDs count too. `spec:`, `prompt:` and priority are
optional; cite the ID, not the title.

Done keeps the 25 most recent completions. Older ones spill automatically to
`backlog.archive.jsonl` on the next write; `cancel` moves a task there instead of
deleting it. The archive is machine-facing JSONL, one task per line: never read
it into context — use `opc task show <id>` or `opc task search <project>
"<text>"`. `opc task restore <id> [--section Now|Next|Later]` reopens a task with
the same ID; `opc task list --all` includes history. Never hand-edit either file.

Done at merge: after the PR merges, the orchestrator runs `opc task done <id>
[--pr <url>]`. Branches and PR bodies carry the ID — branch
`feat/GYM-142-rest-timer`, PR body `Task: GYM-142`. The merged PR stays the code
record; the store holds the plan and state.

Prompts are sessions, not tasks: one scratch folder per task
(`prompts/<date>-<slug>/`), attached with `--prompt`. When a task closes, archive
its folder; leftover work becomes a new task — never a scratch note or a
chat-only remark.

### Kickoff prompts

Every task is filed with a kickoff prompt: the `TASK.md` at the root of its
prompt folder, written at `opc task add` time. The owner starts a new session by
copying it (the console's copy button, or `opc task prompt <id> | pbcopy`), so
it stands alone. It holds:

- `/opc-delegate` as the first line when the task should be orchestrated. That
  is the whole orchestration instruction.
- `Task: <ID> — <title>`, then what is wrong and why it matters: facts,
  evidence, the owner's decisions and limits, open questions.
- What to read: the docs, code entry points, PRs, related tasks and scratch
  evidence that give the context.

It never prescribes the solution — no plan, steps, file lists to change or
acceptance recipe. The agent decides from the context; a good description of
the problem is what makes that possible. It never names a model or effort:
that advice is for the owner and goes on the task's `D:` line
(`Run: Claude Opus 5.5 high`). Worker briefs written during the session go in
subfolders (`<worker>/TASK.md`); the root `TASK.md` stays the kickoff.
`opc check` warns about open tasks without one.

The backlog sequences work; it never invents rules or scope.
