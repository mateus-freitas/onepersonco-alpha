---
type: evidence
status: done
date: 2026-11-08
---

# Mental arithmetic: demand, users and product direction

Task: OPC-45 · HQ idea-8. Research checked 8 November 2026.

This is a plausible small software business to validate, but the keyword screen does **not** establish a large, easy market. The US results contain established competitors, and some supposedly easy terms mix arithmetic with puzzles. The most useful next step is a narrow user experiment around a specific outcome, alongside stronger search-demand data.

## What the volume numbers actually establish

Wow's volume is a 0–100 proxy derived from relevant search-result apps. It does not observe search events. There is no defensible conversion from volume 43 to daily searches, monthly searches, unique people or expected downloads. Five related keywords also do not represent five independent audiences.

For the original US `mental math games` result, Wow reports 13 matching apps, 62,860 matching rating mass and median ratings of 1. The first result, Mental Math Cards, accounts for 59,993 ratings—about 95% of that reported matching mass. Another directly relevant result, Math Brain Booster, has 27,229 ratings but receives a relevance weight of zero for this phrase. These are tool-reported result-app quantities, not verified installs. The combination explains why difficulty 4 can coexist with strong incumbents. It is a weakness in using the proxy as a business-selection rule, not proof of a small or large market.

The dated measurements and expanded country screen appear below. Historical results remain historical; a subsequent score change is not a reason to rewrite the original evidence.

| Original US phrase | 7 Nov volume / difficulty | 8 Nov volume / difficulty | Current rule |
| --- | --- | --- | --- |
| mental math games | 43 / 4 | 43 / 4 | Pass |
| brain math | 30 / 0 | 26 / 0 | Pass |
| mental arithmetic | 30 / 20 | 22 / 0 | Below volume cutoff |
| math quiz | 29 / 10 | 28 / 10 | Pass |
| math drills | 27 / 6 | 26 / 4 | Pass |

The original five become **four** under the same rule. This refresh shows the instability of a sharp threshold; it is not a measured drop in searches. All 18 currently active US phrases were checked, including three new adult/test/percentage variants.

| Country | Current phrases checked | Passing V≥25 / D≤25 | Representative category term: volume / difficulty |
| --- | ---: | ---: | --- |
| USA | 18 | 4 | mental math: 57 / 56 |
| UK | 18 | 0 | mental maths: 41 / 60 |
| Canada | 18 | 0 | mental math: 43 / 60 |
| Japan | 17 | 0 | 暗算: 50 / 72 |
| Germany | 17 | 0 | kopfrechnen: 50 / 79 |
| France | 17 | 0 | calcul mental: 48 / 75 |

105 current measurements in total; no missing active measurements. The saved board also retains 12 historical, hidden US rows, excluded from these denominators. Foreign samples cover core, games, tables, drills, practice, speed and selected adult/test variants; they are not exhaustive. More measurements do not make a sample representative. No countries are pooled. Exact phrases and timestamps are retained in the task CSV.

Narrow adult phrases return volume 0–7 across these markets; percentage-practice phrases return 0. These proxy observations do **not** prove no need, but do mean the proposed adult solution cannot borrow the broad game keywords as validated niche demand. Broad category activity and a narrow product hypothesis are different pieces of evidence.

### Routes to more realistic demand numbers

| Evidence | What it can establish | Availability in this research |
| --- | --- | --- |
| Apple Ads search-term popularity | Country/genre ranks and relative 1–100 / 1–5 popularity derived from searches; still not raw counts | Official API verified. No connected authenticated query tool available; no values obtained directly from Apple. |
| Actual Apple Ads impressions and impression share | A bounded estimate of search opportunities for the same term, country, period and ad-position definition | No relevant campaign/export. No ads launched or money spent. |
| Google Keyword Planner | Approximate average monthly **web** searches, including close variants, for selected locations/network | No connected dataset. Useful for SEO sizing, not a substitute for App Store demand. |
| Google Trends | Relative web-search interest and seasonality | Not absolute volume; cannot calibrate Wow scores. |
| Ratings and public price menus | Category activity, incumbent strength and monetization precedents | Observed; cannot establish active users, revenue or entrant willingness to pay. |

Apple's [Insights API](https://developer.apple.com/documentation/apple-ads-platform-api/insights-endpoints) explicitly distinguishes relative popularity from impression share. With a compatible first-position impression count `I` and share `s`, an inference is `I / s` search opportunities; if share is a range, use `I / upper_share` through `I / lower_share`. Match all dimensions and reporting periods, handle rounding, and do not infer unique users. Hypothetical illustration only: 300 impressions at 20% would imply about 1,500 opportunities for that period, not a measurement for this idea. Apple's [reporting definitions](https://ads.apple.com/app-store/help/reporting/0023-reporting-options-and-definitions) are the source for those denominators.

The practical next data request is an Apple Ads popularity/export for the five original phrases plus `mental math`, then a same-country Google Keyword Planner export for the broader web opportunity. A live App Store campaign requires a relevant eligible app and separately approved spend; using Blocos to advertise arithmetic would not be a valid experiment. Google's [Keyword Planner definitions](https://support.google.com/google-ads/answer/3022575?hl=en-GB) and [Trends methodology](https://support.google.com/trends/answer/4365533?hl=en) explain why their figures must remain separate.

A public stored-data lookup at [App Revs](https://apprevs.com/docs/api/) returned `ads_popularity: 8` for US `mental math`, analyzed 26 October 2026. Its separate `popularity`, `popularity_month` and historical values were null. The provider describes Apple Ads provenance, but its linked source repository was unavailable, so this research cannot independently authenticate the field’s derivation or freshness. It is an older, secondary relative-index observation, not an Apple count and not comparable numerically with Wow’s 57. The five original exact phrases returned “not analyzed” (HTTP 404), which means missing provider coverage, not zero searches. Exact responses are preserved. The five additional foreign core-phrase lookups also returned no stored analysis. No trustworthy absolute monthly counts were obtained.

## What people appear to be looking for

Search intent is inferred from wording and returned products, then triangulated with first-person accounts. We have not interviewed the actual people who entered these App Store queries.

| Query family | Likely job | Important ambiguity |
| --- | --- | --- |
| mental math games | An enjoyable way to practise arithmetic repeatedly | Children, adults, exam candidates and entertainment all overlap. |
| mental arithmetic / trainer / practice | Become faster or more accurate without a calculator | Could mean learning methods, memorising facts, or rehearsing a test. |
| math drills / times tables | Repeat particular facts or operations until fluent | Often school/parent intent; teacher and free-web alternatives matter. |
| brain math / math quiz | A stimulating challenge or quick game | Logic riddles and recreational puzzles dilute arithmetic-learning intent. |
| adult / percentage / test variants | A more specific practical or preparation outcome | The narrower proposition needs its own demand evidence; broad traffic cannot simply be assigned to it. |

## User problems and possible solutions

Problem statements below paraphrase observed themes. The evidence supports problems to investigate, not a claim that competitors have left them unsolved. Reviews are selectively surfaced anecdotes, often old. Their dates matter; current product descriptions sometimes show the requested feature has since been added.

| User problem | Evidence and limit | Solution hypothesis to test |
| --- | --- | --- |
| “I did well at maths, but freeze on percentages or splitting money.” | A [learner's first-person account](https://www.reddit.com/r/learnmath/comments/1vfgcre/im_so_slow_at_mental_math_that_its_honestly_sad/) describes embarrassment, calculator reliance and uncertain benefit from rapid drills. One account, not prevalence. | Private diagnostic; teach decomposition and estimation; move from abstract examples to unfamiliar everyday scenarios. Measure transfer, not only faster tapping. |
| “I get a score, but do not know whether I am improving at the task I need.” | An [interview-preparation discussion](https://www.reddit.com/r/careerguidance/comments/1qxscd4/app_for_mental_math_for_job_interviews/) asks for phone practice and meaningful feedback; differing drill settings make comparisons difficult. | Fixed personal benchmark, accuracy plus response time by skill, and a plain-language next step. Avoid invented population percentiles. |
| “I can calculate alone but fail under verbal time pressure.” | A [candidate describes a chained-percentage error under interview pressure](https://www.reddit.com/r/quantfinance/comments/1rlouwy/ideal_zetamac_score_for_mental_math_prep/). Forum claims about employer cutoffs conflict. | Optional spoken multi-step exercises; gradual time pressure; review the mistaken step. Validate against realistic tasks, not a universal target Zetamac score. |
| “I want repeated practice on one weakness without constant interruptions.” | A 2021 Math Brain Booster review describes short sets, result animations and replay friction. Historical complaint; current behavior untested. | Continuous practice with precise operand limits, optional celebrations and immediate retry. A quality improvement, easily copied. |
| “The timer and visual effects prevent me from concentrating.” | A 2020 Ninimaths review praises its calm display and untimed practice. This is positive evidence for an already-served preference. | Stable layout, untimed learning by default, large controls and optional speed mode. Treat this as baseline quality, not a novel feature. |
| “My child needs to master specific facts, and I need to see what stuck.” | School-oriented products and reviews show table-practice use; Math Is Fun already targets weaknesses. No direct parent interview here. | Parent-selected facts, brief routine and delayed recall checks. Curriculum/content and parent support add maintenance beyond an adult-only tool. |
| “I want practice that resembles real numbers, not just small integers.” | A 2021 Mental Math Cards review requests decimals/negatives and values spoken questions. Current competitors now offer much of this. | Fractions, percentages, money and magnitude estimates with exact answer checking. Validate one coherent daily job rather than collecting number types. |
| “I simply enjoy numerical challenges.” | Public speed-drill and puzzle products serve this job. Enjoyment need not imply learning or payment. | Optional daily challenge/personal best. Keep it secondary if the promise is practical fluency. |

Review sources: [Math Brain Booster](https://apps.apple.com/us/app/math-brain-booster-games/id554437914), [Ninimaths](https://apps.apple.com/jp/app/ninimaths/id647989498), [Mental Math Cards](https://apps.apple.com/us/app/mental-math-cards-games-tips/id500595081). These are hypotheses for product research, not medical claims about anxiety, attention or cognition.

## Competitors and the actual overlap

Public offers checked 8 November; not tested hands-on. Store price menus can contain legacy or segmented SKUs and do not prove the offer shown to every user.

| Alternative | What is already provided | Commercial implication |
| --- | --- | --- |
| [Mental Math Cards](https://apps.apple.com/us/app/mental-math-cards-games-tips/id500595081) | Four operations, methods, graduated difficulty, advanced operands; explicit school and quantitative-interview positioning | US menu: $1.99/month or $14.99/year. Methods and test positioning are not gaps. |
| [Math Brain Booster](https://apps.apple.com/us/app/math-brain-booster-games/id554437914) | Custom sessions, timed practice, mistake workouts, reminders | Menu includes $4.99/month, $19.99/year and lifetime SKUs. Mistake review is not differentiation by itself. |
| [Numbio](https://apps.apple.com/de/app/kopfrechnen-mathe-numbio/id1551025256) | Adaptive practice, money, fractions, percentages, word problems, stepwise tricks and progress; localized into many languages | A close competitor to practical adult fluency, not just school drills. A German review considers premium money/decimal practice attractive, but intent to consider buying is not a purchase. |
| [Elevate](https://themindcompany.com/apps/elevate) | Broader daily mental-fitness routine with 40+ games and tracking | Free daily workout; official US offer $39.99/year or $9.99/month. Competes for habit and budget. |
| [Zetamac](https://arithmetic.zetamac.com/) | Public configurable arithmetic speed drill | A zero-price substitute for the simplest core. |
| [Math Is Fun](https://www.mathsisfun.com/numbers/math-trainer-multiply.html) | Public timed multiplication, wrong-answer feedback and weakness targeting | Adaptive fact practice already has a free web alternative. |
| [Ninimaths](https://apps.apple.com/jp/app/ninimaths/id647989498) | Four operations, 1–5 digit customization, graphs and rankings | Free download; support-named ¥170/330/800 purchases. Calm, focused practice is already supplied. |
| [Sumday](https://apps.apple.com/jp/app/sumday/id6802302480) | Adult five-minute routine, percentages, estimates, daily techniques, adaptive levels and local progress | Direct overlap with the proposed adult direction. Japanese menu lists a ¥600 premium purchase; description says one-time. Sparse ratings do not establish success or failure. |

The recurring feature set is easy to copy. There is no demonstrated moat. A specific curriculum that produces measurable transfer, reliable diagnostics, a trusted reputation and distribution could become advantages, but they require evidence and work. “Uses AI” adds no automatic defensibility; deterministic exercises are likely cheaper and more reliable for the core.

## Product direction worth testing

**Recommendation: start with adult practical fluency as a research hypothesis**, not a full “math app for everyone.” It is compatible with a solo owner and has concrete outcomes. Compare it directly with Numbio and Sumday before deciding it deserves development. Interview-pressure practice is a second candidate with more urgency but potentially short-lived usage; children's curriculum and classroom administration are larger ongoing commitments.

A small test could follow this loop:

1. Pick one goal: everyday percentages/estimation. Run a short diagnostic that distinguishes incorrect methods from slow recall.
2. Teach one strategy with a worked example: 18% of 240 as 20% minus 2%, so 48 − 4.8 = 43.2.
3. Practise a few variations, with an explanation after a mistake and an option to continue without a timer.
4. Apply the same strategy to a new shopping or work scenario, with different numbers and wording.
5. Re-test later using unseen problems. Show accuracy and time on comparable tasks, not an unsupported “brain age” or IQ score.

The user benefit to test is: **“I can handle the numbers I encounter, and understand how I got the answer.”** A faster drill score alone does not prove it. Prioritize a useful learning sequence over streaks, avatars, an AI chat layer or a large question catalogue.

### Scope and solo economics

Use a small browser prototype for the first usability/learning experiment. If the App Store channel is validated, an iPhone-first SwiftUI app is a reasonable production choice given existing iOS work; the arithmetic core needs no server or generative model. Choose Flutter instead if simultaneous Android demand is demonstrated. This is a product-specific recommendation, not a change to HQ's HTML/CSS/JS stack.

Keep the initial shipped scope to deterministic question generation/checking, a reviewed set of strategy explanations, local practice history, optional reminders and a paid unlock. Exclude teacher dashboards, live tutors, social competition infrastructure, large curriculum coverage and open-ended AI tutoring. Coding agents can accelerate implementation; correctness, pedagogy, accessibility, purchases and localization still need testing.

Hypothesis: a free diagnostic/basic practice plus a one-time outcome pack may suit this small product better than promising an endless subscription content stream. Test a proposed US $9.99 pack against the existing $14.99/year comparator; neither price nor conversion is validated. Recurring content, paid acquisition, speech recognition and accounts would increase burden. Generic generated arithmetic alone has weak pricing power.

## Country translation and sequencing

**Validation sequence, not a market-size ranking:** start in the US because it retains four low-difficulty keyword candidates; UK and English Canada are lower-cost localization tests if the product works. The UK’s `mental maths games` is 42/65 and Canada’s equivalent 30/61, so the easy-US result does not transfer. Japan has `暗算トレーニング` 49/71 and `計算ドリル` 46/86; Germany has `kopfrechnen` 50/79; France has `calcul mental` 48/75. These are plausible category signals alongside strong competition, not reasons to rule out the countries or claim that their markets are small. Hold larger localized content investment until the core benefit and acquisition path work.

Localization must cover teaching explanations, decimal/thousands separators, spoken numbers and realistic examples—not just store keywords. US/UK/Canada share much content but differ in wording and currency; this Canadian screen is English and does not cover Quebec French. Germany and France need native-language mathematical vocabulary and number formatting. Japan's 暗算, 算数 and school/flash-arithmetic queries can describe different expectations; do not equate all of them with adult everyday practice.

German school practice has [ANTON](https://anton.app/de/), with free learning and paid extras. France has [calcul@TICE](https://calculatice.ac-lille.fr/), including classroom sequences and mental-calculation practice; its site reports rally participation of nearly 150,000 pupils annually. That is a provider-reported participation figure, **not** a consumer app-market size or search count. Japan has both the established focused Ninimaths and close practical-adult overlap from Sumday. These countries are plausible product markets, but localization alone is not an entry advantage.

## Three decisions before committing to a build

1. **Is there enough reachable search demand?** Obtain Apple-derived popularity for the target phrases and a separate localized web-volume export. Do not treat absent top-term coverage as zero demand. Later, measure impressions, install conversion and paid activation with a relevant product and approved budget.
2. **Which concrete problem is worth switching for?** Recruit about 8 adults with a recent practical arithmetic difficulty and 4 interview candidates as a separate comparison group. Watch their current workaround and competitor use. Test one problem-specific prototype; do not blend the segments into one average.
3. **Does it produce repeatable value someone will pay for?** A proposed directional pilot: at least 6/8 adults complete three sessions in a week, improve accuracy on comparable unseen practical tasks, and at least 3 choose a paid continuation at the disclosed test price. These are pre-set product decision rules, not statistical validation. Use an actual purchase choice only after a usable offer exists; stated interest alone is weaker.

No campaign, prototype, purchase or user outreach was performed in this research. The useful outcome is an evidence-backed next experiment, not a claim that the business is validated.

## Record and verification

The original OPC-44 report is preserved. Raw Wow boards, term breakdowns, country CSV, measurement audit, competitor notes, source lookups and the revision-guarded idea patch are in the OPC-45 scratch prompt folder. Detailed ASO tracking remains in Wow brainstorm `bs_b0915088`; HQ contains a bounded evidence snapshot. The existing idea's original narrative, title, state and project link are preserved.

Research: GPT-6 Astra High orchestration and audit; GPT-6.1 Sol Medium bounded competitor research, through Codex/T3. Source observations were checked by the orchestrator. No product/source implementation, account changes or spending.

Canonical verification: idea-8 revision 5; all seven assessments filled, 23 current keyword rows and 20 sources. Original/protected fields and all 11 other ideas verified unchanged. All 105 current measurements matched the final board and had 8 November timestamps; no active research jobs remained.
