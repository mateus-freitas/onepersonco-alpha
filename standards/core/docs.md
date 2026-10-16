<!-- opc-block: docs -->

## Documentation

### Audience split

- `docs/internals/` — for agents and contributors: decisions, cross-component
  constraints, and implementation traps that are hard to discover from source,
  plus how-tos ("add a component", "run the gates").
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
