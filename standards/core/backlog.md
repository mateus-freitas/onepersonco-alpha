<!-- opc-block: backlog -->

## Backlog

Task state is control-plane data: `~/.onepersonco/<project>/backlog.md`, owned by
`opc task`. It never lives in a project repo, branch, worktree, or PR diff, and
agents never edit it: read with `opc task list|show`, write with
`opc task add|edit|move|done|cancel` (the console uses the same writer). Sections:
`## Now`, `## Next`, `## Later`, `## Done (recent)`.

Format, produced by the CLI and never hand-written:

```
- [ ] OPC-12 · Title — spec: docs/x.md — prompt: prompts/<folder> — p1
- [x] OPC-3 · Done thing — 2026-10-19
  D: optional description line
```

`OPC-12` is the task ID: assigned by `opc task add` (there is no `--id`), stable,
never reused. `spec:`, `prompt:` and priority are optional; cite the ID, not the
title.

Done at merge: after the PR merges, the orchestrator runs `opc task done <id>
[--pr <url>]`. Branches and PR bodies carry the ID — branch
`feat/GYM-142-rest-timer`, PR body `Task: GYM-142`. The merged PR stays the code
record; the store holds the plan and state.

Un-migrated projects read their repo `docs/backlog.md` read-only and show a
migration hint (`opc task migrate <project> --key <KEY>`); never edit it. A
project with no backlog yet starts with `opc task init <project> --key <KEY>`.

Prompts are sessions, not tasks: one scratch folder per unit of work
(`prompts/<date>-<slug>/`), attached with `--prompt` at creation or later via
`opc task edit`. When a task closes, archive its folder; leftover work becomes a
new task — never a scratch note or a chat-only remark.

The backlog sequences work; it never invents rules or scope.
