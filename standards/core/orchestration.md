<!-- opc-block: orchestration -->

## Orchestration (agents running agents)

- The running agent is the orchestrator: it owns architecture, interface
  decisions, task breakdown, review of worker output, and every commit. Explicit
  user instructions win over this block.
- Delegate bounded work that can be verified independently; keep in the
  orchestrator everything that needs taste (interfaces, integration, wording)
  or that touches shared state.
- Worker model and effort selection follows `agent-model-selection`. Cheap
  capable models are the default for a well-specified brief; step up only per
  that policy.
- Every worker gets a complete brief saved as `TASK.md` in the task's scratch
  folder (`prompts/<date>-<slug>/`): the files it owns, the deliverable, the
  verification it must run, and its limits. Parallel workers get disjoint file
  ownership — never two workers on one file.
- Workers never commit, push, or merge. They leave the tree dirty and record
  decisions, evidence, and open questions in the task folder's `NOTES.md`.
- Isolated worktrees live under the worktrees root registered in
  `projects.json` (`~/dev/.onepersonco/worktrees/<project>/<slug>/`). Create
  them there and bind the thread to the path; app-managed checkouts (T3's
  `~/.t3/worktrees/`) are acceptable. Legacy `~/dev/agents-worktrees/` and
  `~/dev/*-wt-*` checkouts are grandfathered, not a pattern.
- The orchestrator reviews every diff, re-runs the verification itself, and only
  then commits. "The worker said it passes" is not verification.
- Prefer async delegation over polling: end the turn and let completion wake the
  orchestrator when the worker finishes.
- Delegation does not replace the project's review gates; substantial changes
  still get the independent review.
- Report back honestly: verified state, what was skipped, and anything the owner
  must decide.
