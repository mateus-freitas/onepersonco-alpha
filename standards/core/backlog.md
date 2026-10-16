<!-- opc-block: backlog -->

## Backlog

- One file per project: `docs/backlog.md`. One line per task; sections
  `## Now`, `## Next`, `## Later`, `## Done (recent)`.
- Format: `- [ ] Title — spec: <path> — p0..p3`. The title is the slug and stays
  stable once a commit or PR cites it; `spec:` and priority are optional.
- Prompts are sessions, not tasks: one scratch folder per unit of work
  (`prompts/<date>-<slug>/`). When a task finishes, check its line and archive
  the folder; leftover work becomes new lines.
- New follow-ups discovered during work go here as lines — not into scratch
  files, review narratives, or chat-only notes.
- The backlog sequences work; it never invents rules or scope.
