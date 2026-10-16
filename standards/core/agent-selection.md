<!-- opc-file: docs/development/agent-model-selection.md -->

# Agent model and effort selection

Owner policy for every agent the orchestrator spawns, whether through Claude
Code (the `Agent` tool's `model`/`effort` parameters or a definition's
frontmatter), Codex CLI (`codex exec -m <model> -c model_reasoning_effort=<level> -C <worktree> …`),
or OpenCode (`opencode run -m opencode-go/<model> …`). All three runtimes are
available on the owner's machine; verify access and the current model list with
the active runtime before relying on a name (`~/.codex/models_cache.json` lists
the Codex models and their supported reasoning levels). Explicit user choices
win over this document.

This document owns the model-family and effort choice. The project's review-gate
document owns when a separate independent review is required and its brief; this
document only says which model to give it. Both are provider-neutral about
names: use the capabilities actually available and record what was used.

## Roles

| Role | Default | Notes |
| --- | --- | --- |
| Orchestrator (planning, task breakdown, architecture decisions, integration) | Claude Fable 5.1 or Opus 5.5, usually medium effort | The orchestrator owns architectural decisions and breaks work into items that a less capable model can execute from the brief alone. |
| Architecture review of heavy or complex work (any author), including the required independent review for intricate ownership, state machines, or cross-runtime changes | Fable 5.1 at medium or high | Fable is reserved for planning and this kind of review. When the orchestrator is itself Fable, spawn a separate reviewer unless the project's independence rule still allows inline review. |
| UI building, UI debugging, behaviour or interaction improvement, design | Claude (Opus 5.5 high, Sonnet 5.5 for bounded items) | Prefer Claude unless the Claude weekly usage limit is near; then fall back to Codex with a tighter brief that names the concrete components, tokens, and rules to follow. |
| Computer-use heavy work (driving browsers, Figma, native simulators/devices, anything beyond the project's local harness) | Codex | Claude handles ordinary screenshots, videos, and simulator work equally well, so those are not reasons to pick Codex. |
| Code-quality or correctness review, especially of complex code written by Codex | Claude (Opus 5.5 high; Sonnet 5.5 medium for bounded diffs) | Codex is acceptable for many routine reviews. Escalate only for the cases in the project's review-gate rules. |
| Well-specified code writing from a complete brief | A cheaper Codex model | Codex has far more token headroom; choose the least capable model that can execute the brief, and reserve `gpt-6-astra` for complex items. |
| Investigation with open-ended decisions (unclear cause, thin brief) | Opus 5.5 high, or `gpt-6-astra` when the Claude budget matters | Codex tends to over-complicate code and architecture; give it tight scope and review the result with Claude. |
| Scripts, data transformation, pure domain code, and unit tests from a complete brief | OpenCode `deepseek-v4.1-flash` | The cheapest default for well-defined work. UI only when the brief fixes every layout and interaction decision. Step up per [OpenCode Go](#opencode-go-cheap-workers). |
| Everything else (docs, scripts, mechanical changes, translations) | OpenCode first when the brief is complete; otherwise either Claude or Codex by cost and availability | Codex token availability is the usual tiebreaker between Claude and Codex. |

## Effort rules

- Never spawn Fable 5.1 for ordinary worker or reviewer tasks; the orchestrator
  is usually Fable or Opus already, and its tokens are the scarcest.
- Opus 5.5: medium or high. Avoid `xhigh` (high usually gives the same results at
  lower cost; reserve it for hard root-cause debugging) and never `max`/`ultra`.
- Sonnet 5.5: medium for bounded reviews and small changes; high only when the
  task genuinely needs it.
- Codex models: `low`–`high` for routine work; `xhigh` only when the task
  genuinely demands it; never `max` or `ultra` without asking the owner first.
- OpenCode models: default variant; pass `--variant high` only when a retry needs it.
- Record the model, effort, and a one-line rationale for every spawned agent in
  the task's record (its evidence folder or the PR body). If per-agent selection
  was unavailable, record the inherited model instead.

## Spawning

- Claude: pass `model` (and `effort`, only when the owner or a definition asks
  for a specific level); a definition without `effort` inherits the parent
  session's level. Do not use agent definitions from other projects without
  reading them first.
- Codex: `codex exec -C <worktree> -m <model> -c model_reasoning_effort=<level>
  -s workspace-write -o <summary file> "<brief>"`. Give the worktree, base/head,
  the files to read (AGENTS.md and the task's documents), the deliverable, and
  the forbidden actions. Use `-s read-only` for reviewers.
- OpenCode: `opencode run --dir <worktree> -m opencode-go/<model> --auto
  --title "<item>" -f <brief file> "Follow the attached brief."` `--auto`
  approves tool permissions that are not explicitly denied; use it only inside
  an isolated worktree.
- Every brief, for any runtime or model, must be complete: worktree, base/head,
  files to read, the exact behaviour and tests, and the forbidden actions. The
  project's own instructions add the platform-specific rules (toolchain, deploy
  bans, device or resource locks).
- Run each worker in its own git worktree when workers can run concurrently, so
  they do not collide in the shared tree or on shared resources.

## OpenCode Go (cheap workers)

The owner's OpenCode Go plan ($10/month, checked 2026-10-15 at
<https://opencode.ai/docs/go/>) gives each model its own monthly allowance, of
which at most 20% is usable per 5 hours and 50% per week. Always use the
`opencode-go/` provider: the `opencode/` provider is pay-per-token Zen, and its
`-free` models may train on what they receive, so never send repository code to
them. Re-check the limits page before relying on the numbers below.

| Tier | Model | Approx. requests/month | Use for |
| --- | --- | --- | --- |
| Default | `deepseek-v4.1-flash` | 173,000 | Scripts, data and CSV work, pure domain code, calculation modules, tests, translations, mechanical edits. UI only from a fully specified brief. |
| Step-up coder | `kimi-k2.7-code` | 6,750 | The same kinds of work with more moving parts, or a retry after flash failed twice. |
| Trial | `mimo-v2.6-flash`, `glm-5.3-flash`, `qwen3.7-plus`, `minimax-m3`, `space-bunny` | 15,000–150,000 | Unproven here. Try one only on a low-risk, easily reviewed item next to a flash run, and record the outcome. |
| Scarce | `kimi-k3` | 490 | Not a worker. At most an occasional second opinion; Claude or Codex is usually the better spend. |

Rules:

- The brief must be complete: files to touch, the exact behaviour, the tests to
  write, and the forbidden actions. If the orchestrator cannot write that brief,
  the task is not an OpenCode task.
- Do not use OpenCode models for architecture or product decisions, open-ended
  debugging, platform interaction behaviour (gestures, keyboard, focus,
  rendering), domain authority or migration routing, security/auth/schema work,
  device or simulator work, or any review.
- Claude or Codex reviews every OpenCode diff before it is integrated, as for
  any worker.
- After two failed attempts on one item, step up one tier or reassign it to
  Claude/Codex; do not keep retrying.
- Promote a trial model to a default only after it has finished several items
  without material review findings; record that decision in the hub's standards.
