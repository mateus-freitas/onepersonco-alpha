<!-- opc-block: orchestration -->

## Orchestration (agents running agents)

- Before delegating work to other agents, load the `opc-delegate` skill — it
  carries the full procedure (briefs, disjoint ownership, launching, verifying).
- Non-negotiables: workers never commit, push, or merge; the orchestrator
  verifies every diff itself and owns every commit; delegation never replaces
  the project's review gates; explicit user instructions always win.
- Model and effort selection follows `agent-model-selection`.
- Closing duty: validate the run against the task store — `opc task list
  <project> --json` before reporting finished. Workers never write the store,
  and branches or PRs never carry task edits; the orchestrator runs
  `opc task add` for discoveries and `opc task done <id> --pr <url>` once each
  PR merges. Missing bookkeeping is a CLI call, not a commit.
- Isolated worktrees live under the worktrees root in `projects.json`
  (`~/.onepersonco/worktrees/<project>/<slug>/`); app-managed checkouts
  (T3's `~/.t3/worktrees/`) are acceptable; legacy paths are grandfathered.
- `opc sync`/`opc check` are checkout-aware: run them from inside the worktree
  you are changing and they target that checkout, so drift and "sync is a
  no-op" are verifiable on the branch before merge. Only the hub's main
  checkout still covers every project; `--dir <checkout>` overrides.
