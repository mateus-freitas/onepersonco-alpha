# One Person Company — alpha

Internal control room for my projects: shared agent/engineering standards, project
skeletons, and the local board that shows what every project is doing.

Status: scrappy, internal, testing. If this grows into a product, the polished
version gets the `onepersonco` name — this checkout keeps `-alpha`.

## Layout

| path | what |
| --- | --- |
| `standards/` | rule fragments synced into each repo's `AGENTS.md` (git/PR etiquette, docs discipline, backlog format, agent-model selection, platform overlays) |
| `projects.json` | the project registry — adding a project here makes the board see it |
| `skeleton/` | template for new projects, extracted from blocos + gymbloc |
| `board/` | local visual board: scan → index → localhost UI |
| `scripts/` | the `opc` CLI: `sync` · `check` · `scan` · `board` (`new` comes with the skeleton) |
| `skills/` | cross-harness agent skills (`opc-delegate`, `opc-task-loop`); install machine-wide with `npx skills add mateus-freitas/onepersonco-alpha` |

Scratch lives *outside* every repo, in the hidden sibling `~/dev/.onepersonco/`
(see its README). Nothing there is committed anywhere; nothing there is a source
of truth.

## Conventions

- Never hand-edit the managed blocks in a repo's `AGENTS.md`; edit `standards/`
  and run `opc sync`.
- Durable knowledge lives in the repos (`docs/internals/`, `rfcs/`, `evidence/`);
  scratch never graduates by accident.
