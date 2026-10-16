# One Person Company — alpha

Internal control room for my projects: the shared agent/engineering standards,
the project registry, the cross-harness agent skills, and the local console that
shows what every project is doing.

Status: scrappy, internal, testing. If this grows into a product, the polished
version gets the `onepersonco` name — this checkout keeps `-alpha`.

## Layout

| path | what |
| --- | --- |
| `standards/` | the rule fragments synced into each repo's `AGENTS.md` (git/PR etiquette, docs discipline, backlog format, orchestration, agent-model selection, platform overlays) |
| `projects.json` | the project registry — adding a project here is all it takes for the console (and `opc sync`) to see it |
| `skills/` | cross-harness agent skills (`opc-delegate`, `opc-task-loop`), installed machine-wide via the skills CLI |
| `console/` | the local visual console: scan → index → localhost UI |
| `scripts/` | the `opc` CLI: `sync` · `check` · `scan` · `console` (`new` comes with the skeleton) |
| `skeleton/` | template for new projects, extracted from blocos + gymbloc (pending) |

Machine-local working data — scratch, worktrees, trash — lives *outside* every
repo in the hidden sibling `~/dev/.onepersonco/` (see its README). Nothing
there is committed; scratch is safe to delete, worktrees are live checkouts.

## Getting started

The scenario this covers: a fresh computer, the projects already cloned
(`~/dev/blocos`, `~/dev/gymbloc`, …), and this hub cloned next to them.
Fifteen minutes, no global installs beyond what npx fetches on demand.

### 1 · Prerequisites

- macOS with `git`, Node ≥ 20 (`node --version`; the repo ships `.nvmrc`, so `nvm use` picks the right one), and `python3` (system is fine)
- GitHub access set up (`ssh -T git@github.com` greets you; `gh auth status` if
  you want the CLI) — needed to push, and the skills repo is public

### 2 · Clone the hub beside the projects

```sh
cd ~/dev
git clone git@github.com:mateus-freitas/onepersonco-alpha.git
```

### 3 · Put `opc` on PATH

```sh
cd ~/dev/onepersonco-alpha
nvm use           # repo ships .nvmrc (Node 24); run nvm install first if nvm asks
npm link          # installs the `opc` bin for the active Node version
opc               # prints usage
```

With nvm, the link belongs to the active Node version — if `opc` ever goes
missing after switching versions, `nvm use` and `npm link` again.

### 4 · Create the machine-local working data

```sh
mkdir -p ~/dev/.onepersonco/{shared,trash,worktrees}
for p in blocos gymbloc onepersonco-alpha; do
  mkdir -p ~/dev/.onepersonco/$p/{prompts,plans,research,artifacts,archive}
done
```

Safety net so scratch never dirties a repo even if a tool writes into one:

```sh
mkdir -p ~/.config/git
grep -qxF 'docs/prompts/' ~/.config/git/ignore 2>/dev/null || printf 'docs/prompts/\n.plans/\n' >> ~/.config/git/ignore
```

### 5 · Point the registry at this machine

Open `projects.json` and make sure every `path` matches where the projects
actually live; add future projects here too. `"standardized": true` marks the
projects that have adopted the standards — the ones `opc sync` writes to.

### 6 · Verify

`opc sync`/`opc check` follow the checkout you run them from — inside a project worktree they answer "is my branch in sync / healthy?" before a merge; from the hub's main checkout they still cover every registered project.

```sh
opc check         # expect 0 errors; info = pending retrofits, not problems
opc sync          # expect "up to date" for standardized projects
opc console       # http://localhost:4770 — reload rescans; click paths to open files
```

### 7 · Install the agent skills (machine-wide)

```sh
cd ~              # from $HOME, not inside a repo — inside one it installs project-scope
npx skills add mateus-freitas/onepersonco-alpha
```

Installs `opc-delegate` + `opc-task-loop` into `~/.agents/skills/`, linked into
Claude Code, Codex, OpenCode and friends (npx downloads the CLI on first run).
After editing a skill in this repo: `npx skills update`.

### 8 · Nothing to install inside the projects

Standardized projects carry managed blocks in `AGENTS.md` (plus a one-line
`CLAUDE.md` pointer) that `opc sync` writes; never edit them by hand. A project
that has not adopted the standards yet shows as "pending retrofit" in
`opc check` and in the console — the retrofit is a guided task (see
`docs/backlog.md`).

## Daily use

- `opc check [--dir <checkout>]` — deterministic health: drift, markers, backlog lines, links; audits the checkout you run it from (worktree included); the hub's main checkout still audits every project; `--dir` overrides
- `opc console` — the console; rescans on every load
- `opc sync [project…] [--dir <checkout>]` — push standards changes into standardized projects; targets the checkout you run it from (worktree included); the hub's main checkout still syncs all standardized projects; `--dir` overrides
- `opc scan --snapshot` — refresh the self-contained `console/snapshot.html`

## Working on the hub itself

- **Rules** live in `standards/core/*` (+ `standards/platforms/*` per stack).
  Change a fragment, run `opc sync onepersonco-alpha`, `opc check`, commit.
  Other projects pick it up at their next sync — the `git-pr` fragment's
  standards-sync carve-out explains how those commits travel.
- **The console** is `console/app.html` + `console/global.css` (the shadcn preset
  theme; dark by default; every color is a token). No build step, no deps.
- **The CLI** is `scripts/opc.mjs` — plain Node, stdlib only. Keep it
  dependency-free; `node --check` + `opc check` before committing.
- **Skills** live in `skills/<name>/SKILL.md`. Quote frontmatter descriptions
  that contain a colon. Push, then `npx skills update`; verify with
  `npx skills list -g`.
- Never hand-edit a managed block in a project; edit the fragment here and
  sync. Durable knowledge lives in the repos (`docs/internals/`, RFCs,
  evidence); scratch never graduates by accident.
