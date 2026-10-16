---
name: opc-delegate
description: Use before delegating or orchestrating agent work in an OPC (One Person Company) project — writing worker briefs, launching subagents or parallel workers, and integrating their results. Triggers: delegate, subagent, worker, orchestrate, spawn agents, run in parallel.
---

# Delegating work in OPC projects

You are the orchestrator. You own architecture, interfaces, integration, and
**every commit**. Workers produce diffs; you own the truth of the result.

1. **Split along verification.** Delegate bounded work you can verify from its
   diff. Keep in your own hands: interfaces, cross-cutting decisions, final
   wording, anything touching shared state. Two chunks are parallel-safe only
   with disjoint file ownership.
2. **Pick models per `docs/development/agent-model-selection.md`** (generated
   from the hub). Default for well-specified work: the cheap OpenCode Go tier
   (`opencode-go/deepseek-v4.1-flash`); step up only on evidence (failed
   attempts, genuine complexity). Record model and effort in the task record.
3. **Write a complete brief** as `TASK.md` in the task's scratch folder
   (`~/dev/.onepersonco/<project>/prompts/<YYYY-MM-DD>-<slug>/`; template:
   the hub's `standards/templates/prompt-folder.md`). A brief carries: workdir
   and owned files, the exact deliverable, how to verify, the forbidden
   actions ("do not commit, push, or merge — leave the tree dirty"), and where
   to write `NOTES.md`. An incomplete brief is not a delegation — it is a
   gamble.
4. **Launch.** T3 Code: `delegate_task` (one task per brief, async, stable
   `clientRequestId`, model in `target`); Claude: the subagent tool; Codex:
   `codex exec -C <worktree> -m <model> …`. Parallel workers get their own
   worktrees (worktrees root in `projects.json`).
5. **While it runs: stop.** End your turn — completion wakes you. Never poll,
   never add a watcher. Don't hand a worker new work on files that are already
   in flight.
6. **On completion: verify, don't trust.** Read `NOTES.md`, review every diff,
   re-run the stated verification yourself. "The worker said it passes" is not
   evidence. Fix or return the work, then commit — the commit is yours.
7. **Report honestly:** verified state, what was skipped, open questions, what
   the owner must decide.

Non-negotiables: workers never commit, push, or merge; delegation never
replaces the project's review gates; explicit user instructions always win.
