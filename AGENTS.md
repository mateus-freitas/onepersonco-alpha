# onepersonco-alpha — hub instructions

This repository is the internal control room: the source of the shared agent
standards, the project registry, the skeleton for new projects, and the console.
It never contains project code. We follow our own rules here — this repo is the
first consumer of everything `standards/` prescribes.

## Layout

- `standards/` — the rule fragments; `opc sync` composes them into the managed
  blocks below and into generated files. Source of truth for every shared rule —
  never edit a synced block or generated file by hand.
- `projects.json` — the registry; registering a project is all it takes for the
  console to see it (`standardized` marks retrofitted projects).
- `skeleton/` — template extracted for new projects
- `console/` — the local console (scan → index → localhost UI)
- `scripts/` — the `opc` CLI
- `docs/` — backlog, internals, glossary, evidence (see `docs/README.md`)
- Scratch: `~/.onepersonco/onepersonco-alpha/` — never commit scratch

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

- One objective per branch and PR; start from refreshed `origin/main`. Continue
  the existing branch when updating its PR.
- Branch names carry intent first: `<type>/<slug>`, the slug starting with the
  task ID when there is one — `feat/GYM-142-rest-timer`, `chore/opc-retrofit` —
  with the conventional types (`feat/`, `fix/`, `docs/`, `chore/`, `refactor/`,
  `test/`, `perf/`). When several agents run concurrently and authorship adds
  signal, prefix the agent that actually authored the branch — `claude/…`,
  `opencode/…`, `codex/…`, `deepseek/…`, e.g.
  `opencode/feat/GYM-142-retrofit`. The prefix is optional and must be truthful;
  the old default of every branch carrying `codex/` regardless of the author is
  retired. Workspace tools that auto-name branches (e.g. `t3/…`) are fine while
  a run is exploratory; rename to the convention once it becomes a real
  objective.
- Never push to `main`, force-push, or rewrite shared history as routine cleanup.
- Preserve unrelated changes in a dirty worktree; stage explicit paths or hunks
  and check the staged diff before committing.
- If work depends on an unmerged PR, use an explicitly documented stacked PR with
  the correct base — never silently bundle a second task.

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
- `docs/history/` — finished RFCs and roadmaps kept for provenance, each with a
  `status: done` header and a pointer to the current doc. Never normative:
  current behavior lives in `internals/`. Keep it small — handoffs, prompt
  packs, checklists and screenshots of finished work are scratch, not history.
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
  registered in `projects.json` (`~/.onepersonco/<project>/`) — never
  committed. Durable knowledge graduates into the repo or it does not count.
- No new `plans/` (or research) folders in repos. Existing committed plan and
  research documents are grandfathered and may stay, but new working plans live
  in scratch only; when the work lands, distill what is durable into
  `internals/` or an RFC/ADR — new or an update to an existing one — and let
  the merged PR be the implementation record. The plan file itself is
  discarded, not committed.
- Evidence for finished work lands in the project's evidence folder or the PR
  body.
- Agent memory (Claude auto-memory, Codex memories) holds only the owner's
  preferences and working style. Project facts, decisions, procedures and
  traps graduate into the repo; open work becomes a task; task state and
  run logs never live in memory.

### Headers

- Docs that belong in the console carry the 4-line header (type · status · date)
  from `templates/doc-header.md`. Everything else is plain markdown.
<!-- opc:end docs -->

<!-- opc:begin backlog -->

## Backlog

Task state is control-plane data: `~/.onepersonco/<project>/backlog.md`, owned by
`opc task`. It never lives in a project repo, branch, worktree, or PR diff, and
agents never edit it: read with `opc task list|show|search`, write with
`opc task add|edit|move|done|cancel|restore` (the console uses the same writer).
Sections: `## Now`, `## Next`, `## Later`, `## Done (recent)`.

Format, produced by the CLI and never hand-written:

```
- [ ] OPC-12 · Title — spec: docs/x.md — prompt: prompts/<folder> — p1
- [x] OPC-3 · Done thing — 2026-10-19
  D: optional description line
```

`OPC-12` is the task ID: assigned by `opc task add` (there is no `--id`), stable,
never reused — archived IDs count too. `spec:`, `prompt:` and priority are
optional; cite the ID, not the title.

Done keeps the 25 most recent completions. Older ones spill automatically to
`backlog.archive.jsonl` on the next write; `cancel` moves a task there instead of
deleting it. The archive is machine-facing JSONL, one task per line: never read
it into context — use `opc task show <id>` or `opc task search <project>
"<text>"`. `opc task restore <id> [--section Now|Next|Later]` reopens a task with
the same ID; `opc task list --all` includes history. Never hand-edit either file.

Done at merge: after the PR merges, the orchestrator runs `opc task done <id>
[--pr <url>]`. Branches and PR bodies carry the ID — branch
`feat/GYM-142-rest-timer`, PR body `Task: GYM-142`. The merged PR stays the code
record; the store holds the plan and state.

Prompts are sessions, not tasks: one scratch folder per task
(`prompts/<date>-<slug>/`), attached with `--prompt`. When a task closes, archive
its folder; leftover work becomes a new task — never a scratch note or a
chat-only remark.

### Kickoff prompts

Every task is filed with a kickoff prompt: the `TASK.md` at the root of its
prompt folder, written at `opc task add` time. The owner starts a new session by
copying it (the console's copy button, or `opc task prompt <id> | pbcopy`), so
it stands alone. It holds:

- `/opc-delegate` as the first line when the task should be orchestrated. That
  is the whole orchestration instruction.
- `Task: <ID> — <title>`, then what is wrong and why it matters: facts,
  evidence, the owner's decisions and limits, open questions.
- What to read: the docs, code entry points, PRs, related tasks and scratch
  evidence that give the context.

It never prescribes the solution — no plan, steps, file lists to change or
acceptance recipe. The agent decides from the context; a good description of
the problem is what makes that possible. It never names a model or effort:
that advice is for the owner and goes on the task's `D:` line
(`Run: Claude Opus 5.5 high`). Worker briefs written during the session go in
subfolders (`<worker>/TASK.md`); the root `TASK.md` stays the kickoff.
`opc check` warns about open tasks without one.

The backlog sequences work; it never invents rules or scope.
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

<!-- opc:begin orchestration -->

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
<!-- opc:end orchestration -->

## Local conventions

- PR policy: **direct** — conventional commit titles straight to `main`; no
  branches or PRs for this repo unless a change is risky.
- Consistency: standardized projects are kept in line by `opc sync` and
  `opc check`. Drift is a bug, not a style choice.
- Skills: after editing `skills/`, run `npx skills update` so every harness
  picks the change up.
- Commands: `opc sync` · `opc check` (deterministic health — markers, drift, backlog, links; exit 1 on errors) · `opc scan [--snapshot]` · `opc hq [--lan]` (alias: `opc console`; rescans on every open; `--lan` also serves the home wifi for phones) · `opc task …` (the task store; IDs are assigned by `add`). `opc new` arrives with the skeleton.
- The hub itself is registered in `projects.json`, so the console covers it.
