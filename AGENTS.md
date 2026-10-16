# onepersonco-alpha — hub instructions

This repository is the internal control room: the source of the shared agent
standards, the project registry, the skeleton for new projects, and the board.
It never contains project code. We follow our own rules here — this repo is the
first consumer of everything `standards/` prescribes.

## Layout

- `standards/` — the rule fragments; `opc sync` composes them into the managed
  blocks below and into generated files. Source of truth for every shared rule —
  never edit a synced block or generated file by hand.
- `projects.json` — the registry; registering a project is all it takes for the
  board to see it (`standardized` marks retrofitted projects).
- `skeleton/` — template extracted for new projects
- `board/` — the local board (scan → index → localhost UI)
- `scripts/` — the `opc` CLI
- `docs/` — backlog, internals, glossary, evidence (see `docs/README.md`)
- Scratch: `~/dev/.onepersonco/onepersonco-alpha/` — never commit scratch

<!-- opc:begin git-pr -->

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

- One objective per branch and PR; start from refreshed `origin/main`; use a
  descriptive branch name. Continue the existing branch when updating its PR.
- Never push to `main`, force-push, or rewrite shared history as routine cleanup.
- Preserve unrelated changes in a dirty worktree; stage explicit paths or hunks
  and check the staged diff before committing.
- If work depends on an unmerged PR, use an explicitly documented stacked PR with
  the correct base — never silently bundle the backlog.

### Commits

- Conventional titles in plain language: `fix(editor): sets no longer jump after ...`.

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
<!-- opc:end git-pr -->

<!-- opc:begin docs -->

## Documentation

### Audience split

- `docs/internals/` — the working reference for agents and contributors:
  decisions, cross-component constraints, and implementation traps that are hard
  to discover from source. Terse, decision-focused; no feature catalogs, file
  trees, or control-flow narration.
- `docs/guides/` — step-by-step how-tos for people working with the code
  ("add a block type", "add a component", "run the gates"): concise, plain
  language, written for a human to work through. Written on demand when a flow
  is genuinely non-obvious — not for everything the code already answers.
- `docs/user/` — for product users, in the product's voice: what it does, how to
  start, anything unintuitive. No implementation detail.
- `docs/operations/` — maintainer setup, release, and debugging procedures.
- Domain folders (`branding/`, `design/`, `marketing/`, `onboarding/`, …) stay
  project-specific.

### Discipline

- Most code changes need no documentation change; agents can read the code.
- A doc earns its place: if reading the relevant code answers the question, leave
  it out. No feature catalogs, file trees, field lists, or control-flow narration.
- Rewrite, never append: when a decision or behavior changes, rewrite or delete
  the affected text. A new page needs a distinct, durable reason.
- Update the canonical doc in the same change as the code that changes it.

### Scratch and evidence

- Prompts, active plans, research notes, and artifacts live in the scratch root
  registered in `projects.json` (`~/dev/.onepersonco/<project>/`) — never
  committed. Durable knowledge graduates into the repo or it does not count.
- Evidence for finished work lands in the project's evidence folder or the PR
  body.

### Headers

- Docs that belong on the board carry the 4-line header (type · status · date)
  from `templates/doc-header.md`. Everything else is plain markdown.
<!-- opc:end docs -->

<!-- opc:begin backlog -->

## Backlog

- One file per project: `docs/backlog.md`. One line per task; sections
  `## Now`, `## Next`, `## Later`, `## Done (recent)`.
- Format: `- [ ] Title — spec: <path> — p0..p3`. The title is the slug and stays
  stable once a commit or PR cites it; `spec:` and priority are optional.
- Prompts are sessions, not tasks: one scratch folder per unit of work
  (`prompts/<date>-<slug>/`). When a task finishes, check its line and archive
  the folder; leftover work becomes new lines.
- New follow-ups discovered during work go here as lines — not into scratch
  files, review narratives, or chat-only notes.
- The backlog sequences work; it never invents rules or scope.
<!-- opc:end backlog -->

<!-- opc:begin review-gates -->

## Review gates

- Every change gets normal correctness review: behavior, acceptance, security,
  data integrity, regressions, and verification adequacy.
- Substantial structural changes additionally get one independent, read-only
  quality/architecture review: new or moved architectural boundaries, shared
  interfaces across features or layers, nontrivial state machines, concurrency,
  caching/recovery responsibilities, or core product implementations (planner,
  persistence, timers, auth, purchases, sync).
- Touching an important subsystem is not enough by itself; a small fix within an
  existing owner is exempt. As a starting point, cohesive changes around ~100
  handwritten lines normally skip it — decide from the triggers, not the count.
- Exempt: tests, fixtures, docs, and straightforward local UI, copy, styling, or
  layout changes.
- The reviewer is separate: fresh context, read-only, no implementation work;
  self-review never satisfies independence. The brief carries the requirement,
  accepted decisions, applicable `AGENTS.md` files, exact diff scope, the
  verification already run, and "no overengineering".
- Model and effort follow `agent-model-selection`; record what was used.
- Verify findings against the actual code; resolve Critical/Important before the
  completion commit; record Minor dispositions. No per-task report files — the
  task's record (evidence folder or PR) is the record.
- Which exact gate commands and review documents apply is the project's own
  business: its local instructions point to them.
<!-- opc:end review-gates -->

## Local conventions

- PR policy: **direct** — conventional commit titles straight to `main`; no
  branches or PRs for this repo unless a change is risky.
- Consistency: standardized projects are kept in line by `opc sync` and (soon)
  `opc check`. Drift is a bug, not a style choice.
- Commands: `node scripts/opc.mjs sync` · `… scan` (refresh `board/data.json`; add `--snapshot` for a self-contained page) · `… board` (serve at localhost, rescans on every open). `opc check` and `opc new` arrive next.
- The hub itself is registered in `projects.json`, so the board covers it.
