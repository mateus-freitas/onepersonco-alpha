# Backlog

The hub's work queue. One line per task; the board derives status, project and
links from position and text. Sections: Now · Next · Later · Done (recent).
Format: `- [ ] Title — spec: <path> — p0..p3` (spec and priority optional).

## Now

- [ ] P3 · Finalize the alpha — dogfood pass: the hub follows everything it prescribes, the board renders it, checks come back green

## Next

- [ ] P4 · `opc check` — deterministic health: structure, drift (`sync` would change nothing), backlog lines, links; runs when the board opens, exit code for hooks
- [ ] Retrofit gymbloc — managed blocks, `docs/internals/`, `backlog.md` seed, prompts → scratch, `swift-ios` overlay
- [ ] Retrofit blocos — backlog seed from the P2-xx roadmaps, `flutter` + `ts-firebase` overlays, consider Greptile parity

## Later

- [ ] P4 · Worktree awareness + write-back (drag to restatus edits the backlog line); `opc` shim on PATH
- [ ] P5 · Skeleton extraction + `opc new` for future projects

## Done (recent)

- [x] P0 · Create the hub + scratch layout; register blocos and gymbloc — 2026-10-16
- [x] P1 · Core fragments drafted; `opc sync` v0 composes the hub's own AGENTS.md and generated files — 2026-10-16
- [x] P1 · Docs split refined: `docs/guides/` added for human how-tos — 2026-10-16
- [x] P3 · Board v1 — `opc scan` + `opc board` + self-contained snapshot; kanban, RFCs, docs, prompts views — 2026-10-16
- [x] P3 · Board restyle — shadcn preset theme in `board/global.css`, readable defaults, dark by default with a toggle; snapshot inlines the theme — 2026-10-16
