---
name: opc-idea
description: Capture and research software product ideas in OPC HQ, or refresh an existing idea's evidence and assessment using the opc idea CLI. Use for early product ideas and opportunity comparisons, not project tasks or implementation work.
---

# OPC ideas

Turn the owner's rough note into a useful decision record without rewriting the
idea or turning it into a development project. `opc idea` owns persistence;
`opc task` owns execution work. Never substitute one for the other.

## Capture or reopen

Read `opc idea --help` for the installed commands, store location and rubric.
For an existing ID, read `opc idea show <id> --json`. For a new idea, search/list
first to avoid duplicates, then use `opc idea add` with `--text-file -` over stdin and a stable
`--request-id`. Preserve the owner's complete original text, language, paragraph
breaks and questions. Derive a short title separately. Reuse the same request ID
when retrying the same creation; if the outcome is uncertain, reconcile by
reading before creating again. A similar title alone is not proof of a duplicate.

Link an existing registered project only when the owner identifies the relation.
Do not register a project, create backlog tasks, or alter other ideas as a side
effect. Respect any requested pilot or approval boundary; reference notes are not
authorization to bulk import them.

Research is the default continuation of a new capture unless the owner asks to
capture only. For an existing idea, research the requested focus and preserve
unrelated findings. Read `opc idea template <id> --json` for writable fields and
shape; do not invent a schema or feed the entire `show` response back as a patch.

## Research that changes a decision

Start from the problem, audience, current workaround and smallest useful outcome.
Keep the original premise separate from proposed improvements. Investigate the
closest alternatives, including spreadsheets, Notes and doing nothing. Identify
exact feature/workflow overlap, not just broad category competitors. Cite primary
product pages, stores or documentation and distinguish advertised features from
hands-on verification. Market activity is not market size; ratings are not users
or revenue. Prefer a bounded validation experiment over an invented TAM or build
duration.

For app discovery, use the available **Wow Keywords MCP**:

Keep detailed keyword tracking, ASO audits and listing work in Wow Keywords.
HQ stores a bounded evidence snapshot and conclusions for the idea's decision,
not a second keyword-management board. Retain the app/brainstorm ID in source
provenance so later research can reopen the same work.

- Start with `status`; reuse a suitable existing brainstorm when its brief and
  market match. Unpublished ideas belong in `session_create` brainstorms, not
  fabricated store listings. Keep unrelated apps, jobs and settings unchanged.
- Inspect current tool schemas. Use a small relevant batch covering category
  terms, the actual job, and the proposed distinction. Select a market/language
  appropriate to the idea; state it explicitly. Broader comparator terms help
  interpret sparse specialist phrasing. Do not assume US English evidence proves
  demand elsewhere.
- Retrieve measurements and, where useful, `session_opportunities` and
  `board_get` results. Follow the tool's documented completion mechanism, with a
  bounded run. Record market, phrase, date, volume and difficulty in keyword rows; put the
  session ID in their cited source's note.
  Missing measurements stay null. Volume is a 0–100 search-result-app proxy,
  **not Apple search counts or search popularity**; difficulty is not the chance
  of ranking. Zero is a measured proxy, not proof that nobody needs the product.
- Treat opportunity reports as AI synthesis, not independent evidence. Check
  important competitor claims against primary sources. Never publish listings,
  change prices or buy services as part of idea research.

For web-first products, investigate search intent and competing results with the
available web tools. Don't apply App Store metrics to web demand. If relevant
connectors are unavailable, record that gap and complete independent research;
do not fabricate metrics or silently replace them with model guesses.

## Assess for a solo owner

Use the CLI's seven dimensions and qualitative judgments. Favorable always means
attractive for this owner, including low ongoing burden. The CLI derives an
equal-weight Fit score from these judgments; never author or patch `fit`, invent
another weighted score, or declare an automatic winner. Confidence remains
separate from Fit and reflects relevant evidence, not source
count: Low is assumption or indirect evidence; Medium is relevant but partial
evidence; High needs converging independent evidence or direct validation of
the actual proposition, with its remaining limits stated. Unknown means unassessed or insufficient evidence, not unfavorable.

- **Organic acquisition:** discoverable intent, realistic ASO/SEO entry point and
  ongoing effort. Neither is permanently automatic after initial setup.
- **Technical feasibility:** a useful MVP, native versus multiplatform/web choice,
  integrations, reliability and data risks. Strong coding agents reduce writing
  effort; they do not remove testing, distribution or maintenance responsibility.
- **Capacity and maintenance:** suitability alongside existing projects; support,
  content, operational dependencies and recurring work. Separate small validation
  scope from the full product vision.
- **Marketing burden:** sustainable distribution, paid creative/testing needs and
  content obligations. Don't assume a solo owner will run a content operation for
  every side product; unknown CAC/LTV stays unknown.
- **Market:** reachable segment and payer, evidence of activity, and uncertainties
  about willingness to pay. Broad TAM is not evidence for the narrow proposition.
- **Differentiation:** why someone would choose or switch; exact overlap and
  switching friction. Existing competition can validate a category while making
  a particular proposition difficult.
- **Defensibility:** copyability and plausible durable advantages, including their
  limits. AI usage alone is not a moat.

Include monetization and operating-cost risks where they affect these dimensions
or the MVP. Propose at most three active questions that could materially change
the decision, each with a next step. Answer the owner's questions when evidence
allows; retain uncertainty instead of adding a long speculative checklist.

## Persist and verify

Use `opc idea update <id> --revision N --file -` with a JSON patch over stdin.
Take N from the **same `show --json` read used to build the patch**. Never refresh
only the revision to submit an older patch. If you re-read, rebuild from that
record and reconcile intervening edits. The template teaches shape; it is not a
whole-record payload to write back. Send only changed top-level fields and only
changed assessment dimensions (each complete). Never resend unchanged title,
state or projectId.
Never edit ideas.json, its backup/lock, or generated console data directly. Use a
JSON serializer and safe shell input handling; never interpolate owner prose into
shell code. The CLI validates types, citations, dates and revisions.

Research normally changes only summary, MVP, assessments, questions, sources,
keywords and next decision. Never change title, original, lifecycle state or
project association unless the owner requests that change. Original edits require
an explicit `--original-file`; research is not permission to revise it.

Append stable source IDs without renumbering existing sources. Preserve sources
still cited by retained assessments. Keep exact URLs when available; local tool
results and owner notes can use a null URL with publisher and precise provenance
in the note. Record actual check dates; leave unknown publication dates null and
preserve partial dates. Do not supply server-owned review dates. A known judgment
without supporting evidence is a low-confidence assumption, clearly described as
such. Never make an assumption look like a verified fact.

Updates replace supplied arrays and MVP whole, and replace each supplied
assessment dimension whole. Preserve fields/citations that remain relevant; don't
accidentally erase evidence by sending a partial dimension. On a revision
conflict, re-read and reapply only when the owner's intervening edits do not
conflict. Otherwise explain the concrete conflict and ask how to reconcile it.
Do not repeatedly overwrite with a fresh revision.

Finally read the canonical record and verify original text, project link,
source references, keyword nulls, and requested scope. Report the idea ID,
material findings, remaining uncertainty and next useful decision. The UI's
“Copy research request” invokes this workflow in the agent harness; the console
does not itself run an AI job.
