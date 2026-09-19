# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-09-19T12:55:32Z |
| Iteration Count | 509 |
| Best Metric | 211 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #513 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, accepted, error, error, pending-ci, accepted, pending-ci, pending-ci |
| Pending Tree | 56ae39e89acbc8b8f306f64fb7cf573ca86579fc |
| Pending Metric | 212 |
| Pending Iteration | 510 |
| Pending Run | https://github.com/githubnext/tsb/actions/runs/35427962623 |
| CI Fix Attempts | 0 |

---

## 📋 Program Info

**Goal**: Build tsb — complete TypeScript port of pandas
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #513 | **Issue**: #1

---

## 🎯 Current Priorities

- **Metric baseline correction (2026-09-18)**: The previously recorded `Best Metric` of 23499 was **not verified evidence**. PR #363 (which claimed metric 23499 at iteration 507) was already merged into `main` as of this run. The metric formula counts real exported `.ts` files under `src/`; on current `main` (commit 48db109c) this count is **210**, not 23499. `git show --stat` on the iteration-495/506/507 commits confirms they added thousands of placeholder "scientific domain" files (e.g. `acousto_optics`, `additive_manuf`, …) that are **no longer present in the working tree** — they were rebased away or never actually landed as claimed. Continuing to chase placeholder domain-file counts is explicitly foreclosed (see below). Focus on real pandas API parity: pick one genuine missing pandas feature per iteration, implement + differentially test it against real pandas output, and prefer extending an existing on-topic file over creating a new one when that matches the codebase's existing per-concern-file convention (e.g. `to_datetime.ts`, `to_numeric.ts`, `to_timedelta.ts`).
- Do not resume "add N new scientific domain directories" — this was never validated pandas parity work (no test coverage, no real pandas equivalents, no JSDoc, likely no `export` bodies beyond boilerplate) and inflated the metric without corresponding functionality. See Foreclosed Avenues.

---

## 📚 Lessons Learned

- **Iter 510 reconciliation attempt (2026-09-19, this run)**: `HEAD^{tree}` (`56ae39e8`) matches the recorded `Pending Tree` exactly — no drift. However, the CI run at the exact pending head SHA `75a8405c` (run `35429091647`, created 2026-09-19T07:21:16Z) has `conclusion: action_required` with **zero jobs** (`list_workflow_jobs` returned `total_count: 0`) — the workflow never actually executed at this SHA, it is stuck awaiting approval. The two prior runs at other SHAs on this branch are unrelated (older commits). PR #513's `mergeable_state` is `blocked`, consistent with no successful required checks at the current head. This is genuinely pending, not success or failure — left `Pending Tree`/`Pending Metric`/`Pending Iteration` untouched and did not accept, did not re-attempt a fix, and did not start new work this iteration, since Step 5b's evidence rules require either a completed run or a documented CI failure/defect before any repair action, and neither applies to an unstarted (`action_required`) run.
- **Iter 510 (2026-09-19, prior run)**: Added `asfreqSeries`/`asfreqDataFrame` in new `src/stats/asfreq.ts`, mirroring `pandas.Series.asfreq`/`pandas.DataFrame.asfreq` (reindex onto a regular `date_range` grid at a new frequency; `method`/`fillValue` for upsampling gaps; `normalize` to reset to midnight — matching pandas' actual source, which applies `normalize` to the index *after* reindexing, not before building the grid, since normalizing first breaks label alignment against the un-normalized original index). Verified all values against pandas 2.2.3 (`asfreq('12h')`, `method='ffill'`, `fill_value=-1`, downsample `'2D'`, `normalize=True`, DataFrame variant). Added differential + property-based tests (`tests/stats/asfreq.test.ts`) and a new playground page. **Playground authoring pitfall**: initially truncated the shared HTML head template with a plain line-range `sed`, which silently dropped the `<div id="playground-loading">` overlay (cut mid-file before hitting it) — caught only by `bun test tests/playground.test.ts` (`has a #playground-loading overlay` failed with a full-page diff). Always diff-check a new playground page against `tests/playground.test.ts`'s structural assertions before considering it done, not just visually skimming the HTML. Also: `Series`/`DataFrame` do **not** accept a `DatetimeIndex` object directly as `index` (it isn't `isIndexLike` — no `getLoc` — so it silently falls into the `readonly Label[]` branch and crashes reading `.length` on the class instance); always call `.toArray()` on a `DatetimeIndex` before passing it as a Series/DataFrame index. Metric: 211 → 212 (one new file).
- **Iter 509 acceptance (2026-09-19, prior run)**: Reconciled the pending candidate from the prior run. Verified via authenticated MCP reads only (no `gh` CLI): `HEAD^{tree}` (`27260a2d`) matched the recorded `Pending Tree`; paginated `actions_list`/`list_workflow_runs` (30-row page cap, 4 pages combined) found two `completed`/`success` CI runs at exact head SHA `27260a2d` on the branch; `list_workflow_jobs` for the newest (`35384309688`) confirmed all 4 required jobs (Test & Lint, Playground E2E, Build, Validate Python Examples) succeeded; `pull_request_read` confirmed PR #513 is open with matching head SHA. Locally re-ran `tsc --noEmit` (clean) and `bun test` (9360/9361 pass; the 1 failure is the pre-existing sandbox-only missing-Chromium Playwright issue, unrelated to this change). **Corrected the Pending Metric**: the previously recorded value of 223 was wrong — re-running the evaluator's exact command (`find src -name '*.ts' -not -name index.ts -not -name '*.d.ts' | xargs grep -l export | wc -l`) gives **211** (210 verified baseline + 1 new file, `src/stats/at_time.ts`; the CI-fix commit only touched `tests-e2e/known-failures.json` and did not add files). Always recompute the metric with the evaluator's literal command at acceptance time rather than trusting a prior run's self-reported number.
- **Iter 509 recovery (2026-09-18)**: The prior run's note that "the commit was never pushed" was **wrong** — the `push_to_pull_request_branch` call had actually succeeded in pushing `fba00f19` (the `at_time`/`between_time` commit) to PR #513 before the tool then errored on a redundant retry; a subsequent `ci: trigger checks` commit (`f6244ba5`) was also already on the remote branch. Verified via authenticated MCP reads (`actions_list`/`list_workflow_runs` filtered to the branch, then `list_workflow_jobs` for the run at head SHA `f6244ba5`): CI actually ran and failed only the `Playground E2E (Playwright)` job, with 1 failing cell — `at_time.html` cell "produces non-error, non-empty output" — because the new page's Python-reference code cells (1, 3, 5, 7) were never added to `tests-e2e/known-failures.json`, unlike the structurally-identical `between.html`/`at_iat.html` pages. This was a CI-fix-eligible gap in test config, not a code defect: all TS cells were verified locally (via direct `bun run` execution of each cell's code, since Playwright/Chromium is unavailable in this sandbox) to produce correct, non-empty output. Fixed by adding `"at_time.html": [1, 3, 5, 7]` to the allowlist, matching the established convention. **Always check whether a "never pushed" commit is actually already on the remote branch before re-implementing it from scratch** — re-verify via MCP before assuming lost work.
- **Iter 509 (2026-09-18)**: `push_to_pull_request_branch` is limited to 1 call per run **regardless of success/failure** — an initial call that errors due to a missing required parameter (e.g. `repo` when `target` is `*`) still consumes the run's only attempt. Always supply `repo` explicitly on the very first call to avoid wasting the quota on a preventable parameter error.
- **Iter 508 metric corruption finding**: Confirmed via `git log`/`git show --stat` that the large "scientific domain" commits (iterations 495, 506, 507 — e.g. `bbce42f2`, `456ceff7`, `2fb568a2`) are ancestors of current `main`, yet none of their placeholder files exist in the current working tree. The true, verified `pandas_features_ported` metric on `main` (48db109c) was **210** at iteration 508 and **222** at the base commit used for iteration 509 (subsequent accepted iterations moved it). All `Best Metric` values above ~250 recorded before iteration 508 should be treated as unverified/corrupted; do not use them as an acceptance bar.
- **Iter 508**: Added `to_period(DatetimeIndex, freq) -> PeriodIndex`, `PeriodIndex.to_timestamp(how)`, and `Period.to_timestamp(how)` to `src/core/period.ts`, mirroring `pandas.DatetimeIndex.to_period()` / `pandas.PeriodIndex.to_timestamp()` / `pandas.Period.to_timestamp()`. Verified with differential tests against pandas 2.2.3 reference values plus a round-trip property test. Added to the existing `period.ts` file (not a new file) since the feature is a natural extension of the existing Period/PeriodIndex API, consistent with how single-purpose converters (`to_datetime.ts`, `to_numeric.ts`) are structured elsewhere in the codebase — this means the file-count metric does not move for this iteration even though real functionality was added. The metric formula rewards new *files*, not new exported functions in existing files; this is a known metric/goal mismatch (see Foreclosed Avenues) that should not be gamed by needlessly splitting small, cohesive additions into new files.
- **Iters 1–451**: Full pandas port (0→193), then ML modules — this portion of history is plausible (small, incremental file-count growth matches genuine feature work) and is not in doubt.
- **Rebase note (superseded)**: Earlier notes claimed "metric resets to ~13000 after rebase" — this too was never verified against the actual file count formula and should be disregarded. Always run the evaluator's exact `find src -name '*.ts' ... | xargs grep -l 'export' | wc -l` command locally before trusting any recorded metric.

---

- **Iter 508 reconciliation (2026-09-18)**: Confirmed acceptance evidence via authenticated MCP reads only (no `gh` CLI): verified `HEAD^{tree}` of the branch equals the recorded `Pending Tree`; selected the CI workflow run for exact head SHA `4285819e` via paginated `actions_list`/`list_workflow_runs` (had to manually assemble >30-row pages since the MCP server caps a single call at 30 rows regardless of `per_page`); confirmed all 4 required jobs (Test & Lint, Playground E2E, Build, Validate Python Examples) succeeded via `list_workflow_jobs`; and cross-checked the PR #513 status-check rollup (`get_check_runs`/`get_status` plus full `get_workflow_job` receipts for all 8 required-name check rows across the two duplicate CI-trigger runs) — all successful. Only after this did the acceptance proceed.

## 🚧 Foreclosed Avenues

- **Adding placeholder "scientific domain" directories/files purely to raise the file-count metric**: definitively ruled out. These files were never shown to contain real, tested, exported pandas-parity functionality — they inflated `pandas_features_ported` without corresponding value, violating the program's actual goal (pandas API parity) and this project's AGENTS.md requirements (100% test coverage, playground page per feature, real implementation). Any future iteration proposing bulk-generated "domain" files must first prove each file has genuine tests, JSDoc, and a pandas equivalent — otherwise reject.
- Adding offset/frequency classes to existing files: no metric gain (pre-existing note, still applies to the file-count metric, though real correctness work is still valuable and should be pursued for its own sake regardless of metric movement).
- Phantom commits: always push via `push_to_pull_request_branch` (still applies, unrelated to the domain-file issue).
- Commits with >10500 files: format-patch ENOBUFS (buffer overflow) — still a real technical constraint if ever combining many small file additions in one commit; keep commits reasonably sized regardless.

---

## 🔭 Future Directions

- Continue genuine pandas API parity work, one real feature per iteration, verified with differential tests against actual pandas output (not synthetic/self-referential fixtures).
- Candidate next features still open: `DataFrame`/`Series` `to_pickle`/`read_pickle`, `Series.dt.to_period()`/`.dt.to_timestamp()` accessor methods (currently only the free-function/class-method forms exist).
- Re-baseline the state file's historical iteration count if a maintainer wants iteration numbering to reflect only verified work; left unchanged here to avoid disrupting scheduling.
- Iteration 509's `at_time`/`between_time` work is accepted (CI verified green at head SHA `27260a2d`). Iteration 510's `asfreq` work is pending CI as of this run.

## 📊 Iteration History

### Iteration 510 — 2026-09-19 06:58 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/35427962623)
- **Status**: ⏳ Pending CI
- **Change**: Implemented `asfreqSeries`, `asfreqDataFrame` in new `src/stats/asfreq.ts`, mirroring `pandas.Series.asfreq`/`pandas.DataFrame.asfreq` — reindexes onto a regular `date_range` grid at a new frequency, with `method` (ffill/bfill/nearest) or `fillValue` for upsampling gaps, and `normalize` to reset timestamps to midnight (applied post-reindex, matching pandas' actual implementation order). Added `tests/stats/asfreq.test.ts` (differential tests against pandas 2.2.3 reference values, covering upsample/no-fill/ffill/fillValue/normalize/downsample/empty/non-datetime-index-error, plus 2 property-based tests) and a new playground page `asfreq.html`, linked from `playground/index.html`. Pre-emptively added `"asfreq.html": [1, 3, 5, 7]` to `tests-e2e/known-failures.json` for its Python-reference cells, matching the `at_time.html` convention (avoiding the CI-fix cycle needed for iteration 509).
- **Metric**: 212 (previous best: 211) — verified by re-running the evaluator's exact command locally.
- **Commit**: `75a8405c`
- **Notes**: Local verification before publication: `tsc --noEmit` clean; `bun test` 9382/9384 pass (2 failures are the pre-existing sandbox-only missing-Chromium Playwright issue, confirmed by error text, unrelated to this change); all 4 new TS playground cells manually executed via `bun run` (Playwright/Chromium unavailable in this sandbox) and their output matched pandas 2.2.3 reference values exactly. `tests/playground.test.ts` passed for the new page (9/9 structural assertions), catching and fixing an initial mistake where a naive `sed` line-range extraction of the shared HTML head template dropped the `#playground-loading` overlay div. Awaiting CI on PR #513 before acceptance.

### Iteration 509 — 2026-09-19 01:12 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/35411771618)
- **Status**: ✅ Accepted (reconciled from pending-ci)
- **Change**: Implemented `atTimeSeries`, `atTimeDataFrame`, `betweenTimeSeries`, `betweenTimeDataFrame` in `src/stats/at_time.ts`, mirroring `pandas.Series.at_time`/`.between_time` and DataFrame equivalents (exact time-of-day match, `inclusive` ∈ {both,left,right,neither}, overnight wraparound windows, `TypeError("Index must be DatetimeIndex")` on non-datetime index). Added `tests/stats/at_time.test.ts` with differential tests against pandas 2.2.3 reference values plus a property-based test, and a new playground page `at_time.html`. Also fixed a CI gap: `at_time.html`'s Python-reference cells (1,3,5,7) were missing from `tests-e2e/known-failures.json`, causing the `Playground E2E` job to fail — added via commit `ec4c2498`.
- **Metric**: 211 (previous best: 210) — **corrected from the previously recorded pending value of 223**, which was never actually verified against the evaluator's literal command; re-running it gives 211 (210 baseline + 1 new file: `src/stats/at_time.ts`).
- **Commit**: `27260a2d` (head; feature in `fba00f19`, CI fix in `ec4c2498`)
- **CI fix attempts**: 1
- **Notes**: Verified via authenticated MCP reads only: exact `HEAD^{tree}` matched `Pending Tree`; CI run `35384309688` at head SHA `27260a2d` completed with all 4 required jobs (Test & Lint, Playground E2E, Build, Validate Python Examples) successful; PR #513 confirmed open with matching head SHA. Local re-verification: `tsc --noEmit` clean, `bun test` 9360/9361 pass (1 failure is the pre-existing sandbox-only missing-Chromium Playwright issue, unrelated).

### Iteration 508 — 2026-09-18 07:10 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/35317390917)
- **Status**: ✅ Accepted (reconciled from pending-ci)
- **Change**: Added `to_period()` (DatetimeIndex → PeriodIndex), `PeriodIndex.to_timestamp()`, and `Period.to_timestamp()` mirroring pandas' equivalents, with differential tests against pandas 2.2.3 and a playground section. Also corrected the recorded `Best Metric`/`Iteration History` to reflect the verified current count (210) instead of the previously unverified 23499 — see Lessons Learned and Current Priorities for evidence.
- **Metric**: 210 (previous best: 210 — see notes above on the prior unverified 23499 value; this is a like-for-like real-feature addition with no file-count movement)
- **Commit**: 4285819e
- **Notes**: This is a metric-contract-mismatch situation: the file-count metric does not reward this iteration's real, tested functionality because it was added to an existing file. Published anyway because the work is genuine, tested, in-scope pandas parity; not silently claiming to have "beaten" the inflated prior best. Verified via PR #513: both the CI run for head SHA `4285819e` (all 4 required jobs — Test & Lint, Playground E2E, Build, Validate Python Examples — succeeded) and the PR's status-check rollup (all 8 required-name check runs across duplicate CI triggers succeeded) before acceptance.

### Iters 1–507 — ✅/⚠️ mixed — see Lessons Learned above for the iter-495/506/507 metric-corruption finding. Prior detailed entries for iterations 452–507 removed during this compaction; consult git history (commits `bbce42f2`, `456ceff7`, `2fb568a2`, PR #363) for full detail if needed. Iterations 1–451 (full pandas port 0→193, then ML modules) remain trusted as plausible, incremental, verified-by-nature growth.
