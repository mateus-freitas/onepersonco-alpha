# Task store

Decided 2026-10-20. Implementation: `opc task` in `scripts/opc.mjs`, the console
server routes, and the scan.

## Problem

Every project kept its queue in `<repo>/docs/backlog.md`, so task state shared
history with code. Branches carried backlog edits, PRs showed backlog diffs,
worktrees could hold divergent queues, and the console had to reconcile writes
by line offset. A task had no identity beyond its title: a rename broke every
reference, and duplicate titles were indistinguishable.

## Decision

Task state is control-plane data, not repository data. The backlog lives at
`~/.onepersonco/<project>/backlog.md`, with `backlog.meta.json` holding
`{ "key": "<KEY>", "next": <n> }` (plus the `prs` map `opc task done --pr`
records) and `backlog.archive.jsonl` holding terminal history beside it. Each
project in `projects.json` carries a unique uppercase key
(`[A-Z][A-Z0-9]{1,5}`).

## Model

Sections stay `Now` / `Next` / `Later` / `Done (recent)`. A line is
`- [ ] OPC-12 · Title — spec: … — prompt: … — p1`; an indented `D:` line is the
description, and Done lines carry `— YYYY-MM-DD`.

The ID is `KEY-N`, allocated only by `opc task add` — no `--id` flag, never from
a caller — and never reused: `next = max(meta.next, maxId(live) + 1,
maxId(archive) + 1)`. Migration assigns IDs in file order, so an ID means the
same task forever. Titles may change; references never break.

Done is a window, not a log: the live store keeps the newest 25 completions.
Every completion (or a one-off `opc task trim`) moves the tail beyond 25 to the
archive. `cancel` appends a canceled record and removes the live line rather
than deleting it, so a mistaken cancel is recoverable with
`opc task restore <id>`. The archive is JSONL — one task per line — because it
is append-heavy, machine-read, and needs explicit fields; the live file stays
markdown because people and agents read it. `show` and `search` span both;
`list` defaults to live, `--all` includes history.

## Write path

One writer. Every mutation takes `backlog.lock` (stale after 10s), re-reads the
file, modifies, writes a temp file and renames it atomically, then releases. The
CLI and the console server share that writer, so a browser drag and an
`opc task move` cannot interleave. Agents write through the CLI only; no branch,
worktree or PR ever carries a task edit, so there is nothing to merge.

Archive-first ordering: cancel/spill appends and fsyncs the archive record, then
rewrites the live file. A crash between the two leaves a duplicate (both files),
never a lost task; `check` reports the duplicate, and repeating cancel/trim
finishes the removal without appending again. Restore does the reverse — writes
live first, then removes the archive line — with the same recoverable duplicate
state.

## Migration

Legacy projects read `<repo>/docs/backlog.md` read-only and show a migration
hint; writes fail with `not migrated: run opc task migrate <project> --key
<KEY>`. That command assigns IDs in file order and creates the store; the repo
file then becomes dead history, deleted by the owner. A project with no backlog
yet starts with `opc task init <project> --key <KEY>`. `opc check` reports
`backlog.legacy` until the migration.

## Why not a SQLite DB yet

The live queue is a few dozen lines, read on every scan and edited by one person.
Markdown stays readable, greppable and recoverable by hand; the lock plus atomic
rename already serializes every writer. History is separate and structured, so a
future database import is a small script, not a parser. Revisit when the store
needs real queries or concurrent editors — the app's chat/agent event stream,
not this queue, will decide the database.
