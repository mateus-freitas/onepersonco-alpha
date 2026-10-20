# Backlog format reference

The store writes this format; this file is never copied into a project repo. The
live store lives at `~/.onepersonco/<project>/backlog.md` and is written only by
`opc task` (CLI) and the console. Sections, in order: `## Now`, `## Next`,
`## Later`, `## Done (recent)`. Done keeps the 25 newest completions; older ones
and canceled tasks move to `backlog.archive.jsonl` (JSONL, one task per line).

```
- [ ] OPC-12 · Title — spec: docs/x.md — prompt: prompts/<folder> — p1
- [x] OPC-3 · Done thing — 2026-10-19
  D: optional description line
```

The ID is allocated by `opc task add` (never by hand, never reused — archived IDs
count too); `spec:`, `prompt:` and priority are optional. A `D:` line directly
under a task is its description; a done line also carries its closing date. Read
history with `opc task show|search`, never by loading the archive into context.
