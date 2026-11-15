---
type: internals
status: accepted
date: 2026-11-07
---

# Ideas and project execution

Ideas belong to the hub, independently of any project checkout. A project link
is a reference, not promotion or task creation: starting a build must not erase
the original opportunity or move research into its execution backlog. The UI
therefore has separate Projects and Ideas roots and fetches idea records without
rescanning Projects. Project refresh must never replace an open idea draft.

The small, single-owner collection uses one validated JSON file in the hub's
scratch root. Markdown is an export, not a second authoritative representation;
CSV would lose nested evidence and the distinction between unknown and measured
zero. A database is unnecessary until query or collaboration requirements change.
Only `opc idea` and the shared HTTP writer mutate it. Ideas never enter ordinary
project scans; snapshots require explicit `--ideas` opt-in.

Revision checks cover a whole idea. Both agents and the UI must build their patch
from the same record read that supplied the revision. Fetching only a newer
revision to submit an old patch defeats conflict detection. UI conflict recovery
reapplies fields changed locally onto one latest record, exposes overlapping
changes for review, and requires another explicit save. Research preserves the
owner's original narrative; CLI original edits require a separate explicit flag.

Creation request IDs survive later edits, with the initial payload fingerprint,
so an uncertain retry cannot create another idea. Retrying a capture must retain
both the ID and payload until the outcome is known. Research dates are stamped
on changed assessments; an ordinary prose edit is not fresh research.

The Ideas lock deliberately has no age-based takeover. A slow live writer must
never lose ownership. Interrupted writes leave a recoverable lock rather than
risk competing writers; confirm no writer is active before manually removing it.
Writes flush the temporary file, retain a previous valid backup, verify ownership
and replace atomically. A corrupt primary (or missing primary with an existing
backup) fails closed. Preserve damaged files for diagnosis and inspect the backup
before explicit recovery; never silently load the backup and resume writing.

The skill performs research in the agent harness; HQ does not run an AI job.
Detailed ASO work stays in Wow Keywords. HQ retains bounded measurements and
provenance to support judgments, including market, language, date and brainstorm
ID. Wow's volume proxy is not an Apple search count, and confidence is an evidence
judgment, not a mechanical consequence of source count.

Fit is a read-only projection shared by the CLI, HTTP payload and snapshots,
never stored or authored by research agents. Favorable earns two points, Mixed
one, Unfavorable zero; Unknown is excluded. All seven dimensions have equal
weight. A rounded 0–100 score appears only once a majority are assessed, always
with coverage. Confidence remains separate and never discounts the score. This
is a transparent comparison aid, not a probability or an automatic winner; the
owner's priorities still determine the decision.
