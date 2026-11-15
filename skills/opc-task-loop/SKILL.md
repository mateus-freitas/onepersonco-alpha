---
name: opc-task-loop
description: "Use when finishing work in an OPC (One Person Company) project. Covers closing a task, cleaning its prompt and worktrees after the PR merges, filing leftovers, deciding where documents go, and graduating durable knowledge. Triggers include task done, PR merged, clean up files, wrap up, write it up, where should this doc go, close the task."
---

# Closing out a task in OPC projects

Work is not done until the bookkeeping is. The whole loop takes a minute.

1. **Close the task.** `opc task done <id> [--pr <url>]` — marks it done with
   today's date; running it twice is a no-op. After a merge the orchestrator runs
   it.
   Leftover work becomes a new task: `opc task add <project> "<title>"` with
   `--spec`, `--prompt`, `--desc` as needed, then `opc task move <id> <section>`.
   Canceled work is not deleted: `opc task cancel <id>` archives it, and
   `opc task restore <id>` reopens it with the same ID. Done keeps only the 25
   most recent completions; older ones spill to the archive automatically. Read
   history with `opc task show <id>` or `opc task search <project> "<text>"` —
   never load the archive file into context.
   Never edit either store file, and never put task edits on a branch — the
   store is control-plane data.
2. **Where does new content go?** (the placement decision)
   - A rule that must never silently be violated → propose a change to the
     matching fragment in the hub (`standards/`), never a repo-local rule.
   - Durable knowledge — decisions and reasons, cross-component constraints,
     traps → `docs/internals/` (or an RFC/ADR for a real decision).
   - A step-by-step procedure for people → `docs/guides/`.
   - Product-user text → `docs/user/`; maintainer procedures → `docs/operations/`.
   - Proof of what happened → `docs/evidence/` or the PR body.
   - A finished RFC or roadmap worth keeping → `docs/history/`, with the
     current behavior distilled into `internals/` first.
   - An owner preference about how agents work → agent memory; a project fact
     or open item found in memory → the repo or a task, then drop the memory.
   - Everything else → scratch (`~/.onepersonco/<project>/`) — and it dies
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
6. **Clean the session.** After the PR merges, run `opc task clean <id>`
   (dry run), then `opc task clean <id> --yes`. It deletes the prompt folder —
   use `--prompt archive` to keep it under `prompts/archive/` — and removes
   clean, merged worktrees. Dirty or unmerged worktrees are kept, and the
   prompt stays linked until they are resolved. The PR/evidence is the record;
   never clean an open task. The console's Done dialog and `remove files`
   button use the same operation.
7. **Verify before claiming done.** `opc task list <project> --json`: every
   related objective is Done, not just the one in hand. Then `opc check` for
   structure and drift, plus the project's own gates for code. Never claim
   green from memory.

This skill points; it does not restate. The rules themselves live in the
project's `AGENTS.md` — its synced blocks and its local sections.
