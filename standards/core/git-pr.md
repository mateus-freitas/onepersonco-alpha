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
- **Every branch and PR names its task ID.** Work that will become a PR has a
  task; if none exists, file one first (`opc task add`). The only exception is
  generated standards sync (below).
- Branch: `<type>/<ID>-<slug>` — `fix/BLO-42-guest-exit-cap`,
  `feat/GYM-142-rest-timer` — with the conventional types (`feat/`, `fix/`,
  `docs/`, `chore/`, `refactor/`, `test/`, `perf/`); the ID keeps its
  uppercase key, the slug is short lowercase kebab-case. When several agents
  run concurrently and authorship adds signal, prefix the agent that actually
  authored the branch — `claude/…`, `opencode/…`, `codex/…`, `deepseek/…`,
  e.g. `opencode/feat/GYM-142-retrofit`. The prefix is optional and must be
  truthful. Workspace tools that auto-name branches (e.g. `t3/…`) are fine
  while a run is exploratory; rename to the convention (`git branch -m`)
  before the first push.
- One task can own several PRs (split or stacked work): each branch and title
  still carries the same ID.
- Never push to `main`, force-push, or rewrite shared history as routine cleanup.
- Preserve unrelated changes in a dirty worktree; stage explicit paths or hunks
  and check the staged diff before committing.
- If work depends on an unmerged PR, use an explicitly documented stacked PR with
  the correct base — never silently bundle a second task.

### Commits

- Conventional titles in plain language: `fix(editor): sets no longer jump after ...`.
  Commits need not repeat the task ID; the branch and PR carry it.

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

- Title: the conventional commit form ending with the task ID in parentheses —
  `fix(auth): guest exit keeps its daily cap (BLO-42)`. The ID goes last so
  the type and summary still read first in lists and changelogs. Retitle a PR
  you continue if it lacks the ID.
- One request is one PR; split only when the objective genuinely spans unrelated
  behavior or the owner asks.
- Body: the problem in a sentence or two, then how it was fixed; relevant
  evidence; remaining limits. Cite the task on its own line (`Task: GYM-142`);
  end with the model and harness that did the work.
- UI changes: before/after images (motion or timing: a short video). Upload media
  to GitHub — never commit PR-only assets to the repo.
- Open draft first when the flow requires independent reviews; mark ready only
  with evidence on the final head. If the project's local block defines an
  external review trigger, apply it before the PR leaves draft; some triggers
  do not fire on PRs that are already ready.
- A merged PR is the implementation record.

### Babysitting

- Watch checks and comments newer than the last push only.
- Verify each bot finding against the source; fix real ones; dismiss false
  positives with a written reason.
- Stay quiet when nothing is new; stop when the latest commit is green.
