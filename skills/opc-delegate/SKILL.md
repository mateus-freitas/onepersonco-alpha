---
name: opc-delegate
description: "Use before delegating or orchestrating agent work in an OPC (One Person Company) project. Covers worker briefs, launching subagents or parallel workers, and integrating their results. Triggers include delegate, subagent, worker, orchestrate, spawn agents, run in parallel."
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
   to write `NOTES.md`. Record the folder on the task's backlog line
   (`— prompt: prompts/<folder>`) so the console links brief and worktree. An
   incomplete brief is not a delegation — it is a gamble.
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
7. **Open the PR by the project's triggers.** Before opening a PR, check the
   project's `AGENTS.md` for external review triggers (labels, bots, order)
   and follow them at open time: open as draft when the flow requires it,
   apply trigger labels while still draft, then mark ready. Record
   selected/skipped in the PR body.
8. **Close the backlog.** At the end of the run, validate `docs/backlog.md`:
   every objective line ticked, every discovery captured as a line, nothing
   half-worded. Workers are allowed to edit the backlog on their branches —
   validate their edits rather than blocking them (a solo agent relies on
   that). Whatever is missing lands as a small separate `docs(backlog): …`
   commit or PR — never reopen a finished PR for bookkeeping.
9. **Report honestly:** verified state, what was skipped, open questions, what
   the owner must decide.

Non-negotiables: workers never commit, push, or merge; delegation never
replaces the project's review gates; explicit user instructions always win.
