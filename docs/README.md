# Hub documentation

| path | audience | what |
| --- | --- | --- |
| `../standards/` | agents + you | the shared rules — source of truth, synced into projects |
| `internals/` | agents + you | how sync, scan, the console and the task store work; decisions and traps |
| `guides/` | you | step-by-step procedures — `tasks.md`: add, move and close a task |
| `glossary.md` | both | shared vocabulary |
| `evidence/` | both | proof and outcomes for finished hub tasks |

The work queue is not a repo file: it is the hub's task store at
`~/.onepersonco/onepersonco-alpha/backlog.md` (history in
`backlog.archive.jsonl`), written only by `opc task` and the console.

Authority: `AGENTS.md` (always read) → `standards/` → `internals/`. The task
store sequences work; it never invents rules.
