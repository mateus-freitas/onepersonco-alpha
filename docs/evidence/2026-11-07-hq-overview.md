---
type: evidence
status: done
date: 2026-11-07
---

# HQ assessment overview — OPC-43

The owner requested faster consumption of the existing research, an overall fit
score with breakdown, and distinct judgment and confidence grading. Fit is now a
shared read-only projection: equal-weight 2/1/0 judgments, Unknown excluded,
majority coverage required. The overview exposes coverage, calculation, grouped
strengths/risks, confidence and next decision. Comparison adds summary rows,
confidence-aware differences and a phone matrix. `opc hq` is preferred;
`opc console` remains supported. Existing pilot records were not changed.

## Verification

- 20 backend tests and 10 browser/integration tests pass in the main checkout.
  Both CLI names start the fixture server. Fit tests cover coverage, rounding,
  confidence independence and rejection from persistent records/patches.
- The new three-idea 768px no-overflow regression failed before the review fix
  and passed afterward in light/dark themes. Capture, edits, conflict recovery,
  focus, snapshot isolation and project navigation retain their existing tests.
- 24 final pilot screenshots at 390/768/1180 in both themes: no page errors or
  page overflow. All 42 semantic color/surface checks pass 4.5:1, with minimum
  4.84 light and 5.43 dark. Pilot scores are Gymbloc 36 and skincare 57; both
  remain revision 2 with original text hashes unchanged.
- Syntax, diff whitespace, skill validation and `opc check` pass. Local skill
  installed across harnesses and `npx skills update` run.

No Safari, physical device, real screen reader or timed usability study was run.
The browser suite uses an existing Playwright through `PLAYWRIGHT_MODULE`.
Screenshots and research evidence remain in scratch; no test writes live ideas.

## Reviews and dispositions

Astra high orchestrated, reviewed every diff, integrated and verified. Sol high
implemented the bounded contract. Opus 5.5 high proposed the hierarchy and then
performed a fresh independent correctness/design review: **8.6/10**, no Critical,
one Important. Its suggested 8.9 after fixes was a projection, not a re-review.
Astra final self-assessment: **8.7/10**; independent review remains Opus's score.

Fresh live Refero metadata informed the contract: Linear Changelog's compact
hierarchy, Visitors' explained score/breakdown, and Memotron's aligned comparison.
Existing HQ tokens and square geometry take precedence. These were live metadata
inspections, not fresh screenshot inspections of those external references.

Opus I1 is fixed: positioning the scroll region contains the hidden accessible
fit summary, preventing three-column comparison overflow at tablet widths.
Minor dispositions: M1 judgment/confidence spacing fixed; M2 decorative arrows
have empty CSS alternative text; M3 native WebKit disclosure marker hidden
(Safari remains unverified); M4 breakdown labels top-aligned; M5 unassessed ideas
omit empty counterevidence copy; M6 differences filter hidden below two choices;
M7 retained assessment before open questions so the overview leads directly to
its supporting reasons, with next decision already prominent; M8 compact list
strip retained with meanings in detail/comparison and accessible counts; M9 skill
update completed. No extra labels, framework or persistent storage fields added.

Other ideas still await owner pilot approval (OPC-42). The existing lock/opener
follow-ups OPC-40/41 remain separate. Direct main commit; no push or PR.
