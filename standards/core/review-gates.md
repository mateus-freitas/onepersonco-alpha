<!-- opc-block: review-gates -->

## Review gates

- Every change gets normal correctness review: behavior, acceptance, security,
  data integrity, regressions, and verification adequacy.
- Substantial structural changes additionally get one independent, read-only
  quality/architecture review: new or moved architectural boundaries, shared
  interfaces across features or layers, nontrivial state machines, concurrency,
  caching/recovery responsibilities, or core product implementations (planner,
  persistence, timers, auth, purchases, sync).
- Touching an important subsystem is not enough by itself; a small fix within an
  existing owner is exempt. As a starting point, cohesive changes around ~100
  handwritten lines normally skip it — decide from the triggers, not the count.
- Exempt: tests, fixtures, docs, and straightforward local UI, copy, styling, or
  layout changes.
- The reviewer is separate: fresh context, read-only, no implementation work;
  self-review never satisfies independence. The brief carries the requirement,
  accepted decisions, applicable `AGENTS.md` files, exact diff scope, the
  verification already run, and "no overengineering".
- Model and effort follow `agent-model-selection`; record what was used.
- Verify findings against the actual code; resolve Critical/Important before the
  completion commit; record Minor dispositions. No per-task report files — the
  task's record (evidence folder or PR) is the record.
- Which exact gate commands and review documents apply is the project's own
  business: its local instructions point to them.
