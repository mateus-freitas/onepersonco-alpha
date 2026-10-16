<!-- opc-block: orchestration -->

## Orchestration (agents running agents)

- Before delegating work to other agents, load the `opc-delegate` skill — it
  carries the full procedure (briefs, disjoint ownership, launching, verifying).
- Non-negotiables: workers never commit, push, or merge; the orchestrator
  verifies every diff itself and owns every commit; delegation never replaces
  the project's review gates; explicit user instructions always win.
- Model and effort selection follows `agent-model-selection`.
- Isolated worktrees live under the worktrees root in `projects.json`
  (`~/dev/.onepersonco/worktrees/<project>/<slug>/`); app-managed checkouts
  (T3's `~/.t3/worktrees/`) are acceptable; legacy paths are grandfathered.
