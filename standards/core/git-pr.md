<!-- opc-block: git-pr -->

## Git, commits and pull requests

Applies to every registered project. This block sets the etiquette; the project's
own instructions state its PR policy and verification commands.

### PR policy (stated in each project's local block)

- **agents-open** — the agent branches, commits, pushes, and opens or updates a
  draft PR for the objective without asking again. Ready is not approval: merging
  stays the owner's decision unless the task says otherwise.
- **ask-first** — do not push or open a PR until the task or the owner asks.
- **direct** — commit straight to `main`; no branches or PRs (the hub itself).

A setup-only request never authorizes a push or PR by itself, whatever the policy.

### Work on one objective

- One objective per branch and PR; start from refreshed `origin/main`. Continue
  the existing branch when updating its PR.
- Branch names carry intent first: `<type>/<slug>` with the conventional types
  (`feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/`, `perf/`), e.g.
  `feat/rest-timer`, `chore/opc-retrofit`. When several agents run concurrently
  and authorship adds signal, prefix the agent that actually authored the
  branch — `claude/…`, `opencode/…`, `codex/…`, `deepseek/…`, e.g.
  `opencode/feat/gymbloc-retrofit`. The prefix is optional and must be truthful;
  the old default of every branch carrying `codex/` regardless of the author is
  retired. Workspace tools that auto-name branches (e.g. `t3/…`) are fine while
  a run is exploratory; rename to the convention once it becomes a real
  objective.
- Never push to `main`, force-push, or rewrite shared history as routine cleanup.
- Preserve unrelated changes in a dirty worktree; stage explicit paths or hunks
  and check the staged diff before committing.
- If work depends on an unmerged PR, use an explicitly documented stacked PR with
  the correct base — never silently bundle the backlog.

### Commits

- Conventional titles in plain language: `fix(editor): sets no longer jump after ...`.

### Standards sync (generated)

`opc sync` output is generated from the hub fragments — never authored work.

- Commit it on its own with `chore(standards): sync …`; the only required
  evidence is `opc check` green on that head (byte-compare; no review gates,
  no task brief).
- Route it as a micro-PR when the project prefers PRs for everything (the
  owner merges it without reviews), or commit it directly to the default
  branch when the project permits direct maintenance commits — the only
  documented exception to the no-direct-push rule above.
- Never mix sync output with authored changes in one commit.

### Pull requests

- One request is one PR; split only when the objective genuinely spans unrelated
  behavior or the owner asks.
- Body: the problem in a sentence or two, then how it was fixed; relevant
  evidence; remaining limits. End with the model and harness that did the work.
- UI changes: before/after images (motion or timing: a short video). Upload media
  to GitHub — never commit PR-only assets to the repo.
- Open draft first when the flow requires independent reviews; mark ready only
  with evidence on the final head.
- A merged PR is the implementation record; update the tracking item when it lands.

### Babysitting

- Watch checks and comments newer than the last push only.
- Verify each bot finding against the source; fix real ones; dismiss false
  positives with a written reason.
- Stay quiet when nothing is new; stop when the latest commit is green.
