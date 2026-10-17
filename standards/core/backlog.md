<!-- opc-block: backlog -->

## Backlog

- One file per project: `docs/backlog.md`. One line per task; sections
  `## Now`, `## Next`, `## Later`, `## Done (recent)`.
- Format: `- [ ] Title — spec: <path> — prompt: <prompts folder> — p0..p3`.
  The title is the slug and stays stable once a commit or PR cites it; `spec:`,
  `prompt:` and priority are optional. An indented `D: <text>` line directly
  under a task is its description — the console shows it on the task's card
  and detail view.
- The backlog lives in `main` and is the single source of truth. A branch may
  carry `docs/backlog.md` edits for its objective — tick its line, add
  follow-ups it discovered — and those edits become real when the PR merges.
  Worktrees never keep a separate task list.
- Prompts are sessions, not tasks: one scratch folder per unit of work
  (`prompts/<date>-<slug>/`), linked from the task line with `prompt:` so the
  tooling can find its brief and worktree. When a task finishes, check its line
  and archive the folder; leftover work becomes new lines.
- New follow-ups discovered during work go here as lines — not into scratch
  files, review narratives, or chat-only notes.
- Closing is validated, not assumed: a single agent ticks its own line in its
  branch; an orchestrator validates the full backlog for the run at the end
  (every line ticked, discoveries captured) and lands any missing bookkeeping
  as a small separate `docs(backlog): …` commit or PR.
- The backlog sequences work; it never invents rules or scope.
