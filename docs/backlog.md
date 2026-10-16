# Backlog

The hub's work queue. One line per task; the console derives status, project and
links from position and text. Sections: Now · Next · Later · Done (recent).
Format: `- [ ] Title — spec: <path> — p0..p3` (spec and priority optional).

## Now

## Next

- [ ] Retrofit blocos — backlog seed from the P2-xx roadmaps, `flutter` + `ts-firebase` overlays, consider Greptile parity
- [ ] Sync gymbloc — `opc check` reports AGENTS.md drift on its main (run `opc sync` there)

## Later

- [ ] P4 · Console write-back (drag to restatus edits the backlog line)
- [ ] P4 · Worktrees follow-ups — drift vs standards, backlog delta vs main, cleanup action
- [ ] P4 · `opc sync`/`check` — reject unknown flags instead of ignoring them (a typo like `-dir` silently falls back to the CWD/control-room target)
- [ ] Lifetime · Fold legacy worktrees (`~/dev/agents-worktrees/`, `~/dev/*-wt-*`) into the worktrees root as they finish
- [ ] P4 · Legacy worktree root — `~/dev/agents-worktrees/planner-*` are not git worktrees (stale leftovers; inspect and remove)
- [ ] P5 · Skeleton extraction + `opc new` for future projects
- [ ] P5 · `opc bootstrap` — script the README's new-machine steps (scratch dirs, gitignore safety net, registry check)

## Done (recent)

- [x] P0 · Create the hub + scratch layout; register blocos and gymbloc — 2026-10-16
- [x] P1 · Core fragments drafted; `opc sync` v0 composes the hub's own AGENTS.md and generated files — 2026-10-16
- [x] P1 · Docs split refined: `docs/guides/` added for human how-tos — 2026-10-16
- [x] P3 · Board v1 — `opc scan` + `opc board` + self-contained snapshot; kanban, RFCs, docs, prompts views — 2026-10-16
- [x] P3 · Board restyle — shadcn preset theme in `board/global.css`, readable defaults, dark by default with a toggle; snapshot inlines the theme; colored project dots from the OPC palette — 2026-10-16
- [x] P4 · `opc` runs by name — `opc sync/check/scan/board` from any directory — 2026-10-16
- [x] P4 · `opc check` — deterministic health: structure, drift (dry-run sync), backlog lines, links; shown by the board, exit code for hooks — 2026-10-16
- [x] P3 · Finalize the alpha — hub dogfood complete: health green (0 errors, 0 warnings), health rendered in the board — 2026-10-16
- [x] Setup · Private GitHub remote + first push (`mateus-freitas/onepersonco-alpha`) — 2026-10-16
- [x] P1 · Orchestration rules in the standards (`core/orchestration`), synced into AGENTS.md — 2026-10-16
- [x] Standards · Branch naming: intent-first (`feat/`, `fix/`, …); author prefix optional + truthful (`codex/` only when Codex authors it) — 2026-10-16
- [x] Standards · Worktrees root: OPC-managed checkouts live in `~/dev/.onepersonco/worktrees/<project>/<slug>/`; T3's own folder accepted — 2026-10-16
- [x] Standards · Plans are scratch-only going forward — no new repo `plans/` files; durable outcomes graduate into `internals/` or an RFC/ADR — 2026-10-16
- [x] Retrofit gymbloc — #38 merged; standards-sync micro-PRs #39 + #40 (first uses of the carve-out) — 2026-10-16
- [x] Standards · Standards-sync commit carve-out — micro-PR (review-exempt) or direct where permitted; `opc check` green is the evidence — 2026-10-16
- [x] Skills v1 — `opc-delegate` + `opc-task-loop` authored in `skills/`, installed machine-wide via the skills CLI — 2026-10-16
- [x] Standards · Backlog source-of-truth + orchestrator closing duty; both skills refreshed — 2026-10-16
- [x] P4 · Worktree awareness for `opc sync`/`check` — target the active worktree, not the registry's main checkout (a live sync wrote into gymbloc's main during the retrofit; reverted by hand) — 2026-10-16
- [x] P3 · Worktrees view in the console — every project's checkouts (OPC root · T3 · legacy) with branch, dirty, ahead/behind, PR status via `gh`, clickable paths, and a "safe to remove" hint when merged + clean — 2026-10-16
