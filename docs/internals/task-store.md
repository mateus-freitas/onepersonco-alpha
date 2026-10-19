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
records) beside it. Each project in `projects.json` carries a unique uppercase
key (`[A-Z][A-Z0-9]{1,5}`).

## Model

Sections stay `Now` / `Next` / `Later` / `Done (recent)`. A line is
`- [ ] OPC-12 · Title — spec: … — prompt: … — p1`; an indented `D:` line is the
description, and Done lines carry `— YYYY-MM-DD`.

The ID is `KEY-N`, allocated only by `opc task add` — no `--id` flag, never from
a caller — and never reused: `next = max(meta.next, maxId + 1)`. Migration
assigns IDs in file order, so an ID means the same task forever. Titles may
change; references never break.

## Write path

One writer. Every mutation takes `backlog.lock` (stale after 10s), re-reads the
file, modifies, writes a temp file and renames it atomically, then releases. The
CLI and the console server share that writer, so a browser drag and an
`opc task move` cannot interleave. Agents write through the CLI only; no branch,
worktree or PR ever carries a task edit, so there is nothing to merge.

## Migration

Legacy projects read `<repo>/docs/backlog.md` read-only and show a migration
hint; writes fail with `not migrated: run opc task migrate <project> --key
<KEY>`. That command assigns IDs in file order and creates the store; the repo
file then becomes dead history, deleted by the owner. A project with no backlog
yet starts with `opc task init <project> --key <KEY>`. `opc check` reports
`backlog.legacy` until the migration.

## Why not a SQLite DB yet

The queue is a few dozen lines, read on every scan and edited by one person.
Markdown stays readable, greppable and recoverable by hand; the lock plus atomic
rename already serializes every writer. A database would add a schema,
migrations and an inspection tool for a file that fits on one screen. Revisit
when the store needs real queries, history, or concurrent editors.
