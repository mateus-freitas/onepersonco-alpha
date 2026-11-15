# prompts/<YYYY-MM-DD>-<slug>/

The scratch folder for one unit of work. Lives under
`~/.onepersonco/<project>/prompts/`, one folder per task so parallel agents
never collide.

- `TASK.md` — the kickoff prompt the owner copies into a new session
  (rules: the backlog block, "Kickoff prompts")
- `<worker>/TASK.md` — briefs the orchestrator writes for its workers
- `NOTES.md` — running notes: decisions, blockers, follow-ups found
- `*.log` — raw agent output, only when worth keeping short-term

Kickoff shape (no solution, no model):

```
/opc-delegate                      ← only when the task should be orchestrated
Task: GYM-142 — Rest timer resets when the app returns from background

<What is wrong and why it matters: facts, evidence, the owner's decisions and
limits, open questions.>

Read:
- AGENTS.md, <module>/AGENTS.md
- docs/internals/<topic>.md
- PR #<n>, GYM-<related>
```

Link the folder from its backlog task (`— prompt: prompts/<folder>`); the link
keeps resolving after the folder is archived.
