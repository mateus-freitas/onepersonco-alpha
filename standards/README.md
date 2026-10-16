# Standards fragments

Each file here is one rule area, composed into a project's `AGENTS.md` or synced
as a whole file by `opc sync`. Projects never edit synced content by hand;
platform-specific content stays outside the managed markers.

Marker convention (first line of every fragment):

- `<!-- opc-block: <name> -->` — composed into `AGENTS.md` between matching
  begin/end markers as one section.
- `<!-- opc-file: <repo path> -->` — synced as the complete file at that path
  (for policies too long to live inside `AGENTS.md`).

## Core (drafted, in review)

| fragment | target | covers |
| --- | --- | --- |
| `core/git-pr.md` | block `git-pr` | branches, commits, PR etiquette, per-project PR policy, babysitting |
| `core/docs.md` | block `docs` | audience split, discipline, scratch rules, doc headers |
| `core/backlog.md` | block `backlog` | the one-line task format and section names |
| `core/review-gates.md` | block `review-gates` | when the independent review is required; the shared contract |
| `core/agent-selection.md` | file `docs/development/agent-model-selection.md` | model/effort selection (replaces the two diverged copies) |

## Pending

| fragment | lands with |
| --- | --- |
| `platforms/flutter.md` · `platforms/ts-firebase.md` | the blocos retrofit |
| `platforms/swift-ios.md` | the gymbloc retrofit |

`templates/` holds the small stubs agents copy: `backlog.md`, `doc-header.md`,
`prompt-folder.md`.
