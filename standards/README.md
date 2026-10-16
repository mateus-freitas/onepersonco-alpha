# Standards fragments

Each file here is one rule area, written to be composed into a project's
`AGENTS.md` between managed markers by `opc sync`. Projects never edit a synced
block by hand; platform-specific content stays outside the markers.

Planned fragments (first draft lands with P1):

| fragment | covers |
| --- | --- |
| `core/git-pr.md` | branches, commits, PR etiquette, babysitting protocol |
| `core/docs.md` | audience split, internals discipline, doc headers, scratch rules |
| `core/backlog.md` | the one-line task format and section names |
| `core/agent-selection.md` | model/effort selection (currently duplicated in both repos — dedupe here) |
| `core/review-gates.md` | the review policy each project hooks in |
| `platforms/flutter.md` · `platforms/ts-firebase.md` · `platforms/swift-ios.md` | toolchain + verification per platform |

`templates/` holds the small stubs agents copy: `backlog.md`, `doc-header.md`,
`prompt-folder.md`.
