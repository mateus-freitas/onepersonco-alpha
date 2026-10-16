# onepersonco-alpha — hub instructions

This repository is the internal control room: the source of the shared agent
standards, the project registry, the skeleton for new projects, and the board.
It never contains project code. We follow our own rules here — this repo is the
first consumer of everything `standards/` prescribes.

## Layout

- `standards/` — rule fragments, composed into each project's `AGENTS.md` by
  `opc sync`; stub templates in `standards/templates/`
- `projects.json` — the registry; registering a project is all it takes for the
  board to see it
- `skeleton/` — template extracted for new projects
- `board/` — the local board (scan → index → localhost UI)
- `scripts/` — the `opc` CLI
- `docs/` — backlog, internals, glossary, evidence (see `docs/README.md`)
- Scratch: `~/dev/.onepersonco/onepersonco-alpha/` — prompts, active plans,
  research, artifacts. Never commit scratch.

## Conventions

- Edit shared rules only in `standards/`; never hand-edit a synced block in a
  project. Run `opc sync` after changing a fragment.
- Docs discipline (our own rule): docs earn their place; rewrite the affected
  text, never append a second account; durable knowledge goes to
  `docs/internals/` or a project's canonical docs.
- Work is tracked as one-line tasks in `docs/backlog.md`; active plans live in
  scratch until the work lands.
- Commits: conventional titles in plain language, straight to `main`. No
  branches or PRs for this repo unless a change is risky.
- Board-worthy docs carry the header from `standards/templates/doc-header.md`;
  everything else is plain markdown.

## Commands (growing with the tool)

- `opc sync` — compose managed blocks into registered projects
- `opc lint` — validate backlog lines, doc headers and links
- `opc scan` — build the board index
- `opc board` — serve the local board
