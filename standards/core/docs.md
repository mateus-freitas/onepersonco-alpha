<!-- opc-block: docs -->

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
- No new `plans/` (or research) folders in repos. Existing committed plan and
  research documents are grandfathered and may stay, but new working plans live
  in scratch only; when the work lands, distill what is durable into
  `internals/` or an RFC/ADR — new or an update to an existing one — and let
  the merged PR be the implementation record. The plan file itself is
  discarded, not committed.
- Evidence for finished work lands in the project's evidence folder or the PR
  body.

### Headers

- Docs that belong on the board carry the 4-line header (type · status · date)
  from `templates/doc-header.md`. Everything else is plain markdown.
