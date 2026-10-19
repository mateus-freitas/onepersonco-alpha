---
name: opc-task-loop
description: "Use when finishing work in an OPC (One Person Company) project. Covers closing a task, filing leftovers, deciding where documents go, and graduating durable knowledge. Triggers include task done, wrap up, write it up, where should this doc go, close the task."
---

# Closing out a task in OPC projects

Work is not done until the bookkeeping is. The whole loop takes a minute.

1. **Close the task.** `opc task done <id> [--pr <url>]` — marks it done with
   today's date; running it twice is a no-op. After a merge the orchestrator runs
   it.
   Leftover work becomes a new task: `opc task add <project> "<title>"` with
   `--spec`, `--prompt`, `--desc` as needed, then `opc task move <id> <section>`.
   Never edit the store file, and never put task edits on a branch — the store
   is control-plane data.
2. **Where does new content go?** (the placement decision)
   - A rule that must never silently be violated → propose a change to the
     matching fragment in the hub (`standards/`), never a repo-local rule.
   - Durable knowledge — decisions and reasons, cross-component constraints,
     traps → `docs/internals/` (or an RFC/ADR for a real decision).
   - A step-by-step procedure for people → `docs/guides/`.
   - Product-user text → `docs/user/`; maintainer procedures → `docs/operations/`.
   - Proof of what happened → `docs/evidence/` or the PR body.
   - Everything else → scratch (`~/dev/.onepersonco/<project>/`) — and it dies
     there. Nothing temporary is committed.
3. **Graduate.** If the work produced durable knowledge, write it now:
   distill into `internals/` or an RFC/ADR — new, or an update to an existing
   one. The working plan file itself is discarded, never committed.
4. **Open the PR by the project's triggers.** Before opening a PR, check the
   project's `AGENTS.md` for external review triggers (labels, bots, order)
   and follow them at open time: open as draft when the flow requires it,
   apply trigger labels while still draft, then mark ready. Record
   selected/skipped in the PR body.
5. **Record.** The merged PR is the implementation record; the task's state is
   already in the store. An evidence folder only when the project tracks one.
6. **Archive the session.** Move the task's scratch folder
   (`prompts/<date>-<slug>/`) to `prompts/archive/` once its outcome is
   captured — the task's `prompt:` link still resolves there; anything still
   open is a task, not a note.
7. **Verify before claiming done.** `opc check` for structure and drift, plus
   the project's own gates for code. Never claim green from memory.

This skill points; it does not restate. The rules themselves live in the
project's `AGENTS.md` — its synced blocks and its local sections.
