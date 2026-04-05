# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-05T03:39:53Z |
| Iteration Count | 43 |
| Best Metric | 65 |
| Target Metric | — |
| Branch | `work-branch-41-a62d454c5d6737a7` |
| PR | #45 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `work-branch-41-a62d454c5d6737a7`
**Pull Request**: #45

---

## 🎯 Current Priorities

Iter 43 complete (65 files). Added: sparse.ts, offsets.ts, testing.ts, stats/hypothesis.ts, io/to_excel.ts.

Next candidates:
- Playground pages for new modules (sparse, offsets, testing, hypothesis, excel)
- `src/core/interval.ts` — Interval (single) type, complementing IntervalIndex (+1)
- `src/core/na-type.ts` — pd.NA / NAType singleton (+1)
- `src/core/flags.ts` — DataFrame/Series Flags (allows_duplicate_labels) (+1)
- `src/window/rolling-corr.ts` — rolling correlation/covariance (+1)
- `src/io/to_markdown.ts` — DataFrame.to_markdown() (+1)
- `src/io/to_html.ts` — DataFrame.to_html() full table output (+1)
- `src/io/to_latex.ts` — DataFrame.to_latex() (+1)
- `src/stats/pairwise.ts` — pairwise statistics utilities (+1)

---

## 📚 Lessons Learned

- **Iter 43 (5 new modules, 60→65)**: Added sparse.ts (SparseArray/SparseDtype with COO storage, binarySearch, fill-value semantics), offsets.ts (DateOffset/BusinessDay/MonthEnd/MonthBegin/YearEnd/YearBegin/dateRange — key bug: use setUTCFullYear(year, month, day) atomically to avoid intermediate date overflow), testing.ts (assertSeriesEqual/assertDataFrameEqual/assertIndexEqual/AssertionError), stats/hypothesis.ts (ttest1samp/ttestInd/ttestRel/chi2test/kstest/ztest — key bugs: incompleteBeta boundary values were swapped 0↔1; degenerate case sd=0 returns t=0,p=1), io/to_excel.ts (pure-TS XLSX writer with embedded PKZip and CRC-32, no deps). Key API reminders: Series uses `new Series({data:[...]})` not `fromArray`; Index uses `.size` not `.length`; Index.from takes `{data:[...]}` not an array.
- **Iter 40 (15 modules consolidated, 37→52)**: The work-branch based on c35a31aa0 only had 37 files; scattered modules from iters 18-25 (io/stats/categorical/multiindex/timedelta/interval-index/categorical-index/datetime-index) were on separate branches never merged in. Used `git show <branch>:<file>` to extract files from old branches. `safeoutputs-create_pull_request` works with local branches that DON'T track a remote (work-branch). Biome `--unsafe --write` fixes block statement warnings. `Dtype.bool/float64/int64` etc. are properties not methods (no `()`). `SeriesOptions.name` is `string | null` not `string | undefined`. `DataFrame.fromColumns()` is the factory method (not `new DataFrame(record, options)`).
- **Iter 39 (15 modules, 47→51)**: Largest single-iteration gain. Used cherry-pick from iter39 branch onto window-17 PR branch to work around push auth limitation. `safeoutputs-create_pull_request` requires local branch to track an existing remote ref — use `git checkout -b <remote-branch> --track origin/<remote-branch>`, cherry-pick changes, then call create_pull_request. biome `--write` fixes format+imports automatically after lint fixes.
- **Iter 38 (shift/str-adv/apply/datetime-convert/rank/frequency/cut/dummies/assign/explode/wide-to-long)**: Added 11 files in one iteration from datetime-tz-25 base (36→47). Key: all lint issues must be resolved before commit. CC>15 requires extracting helper functions. Nested ternary must be replaced with if/else. `Array<T>(n).fill(v)` pattern for fixed-size arrays.
- **General**: `exactOptionalPropertyTypes`: use `?? null`. `noUncheckedIndexedAccess`: guard array accesses. CC≤15: extract helpers. `useTopLevelRegex`: move regex to top. `useNumberNamespace`: `Number.NaN`. `import fc from "fast-check"` (default). `useForOf` requires for-of not for-let-i.
- **Imports**: import from `../../src/index.ts` (tests), barrel `../core/index.ts` (src). `import type` for type-only. `useDefaultSwitchClause`: default: in every switch.
- **Build env**: bun not available — use `npm install` then `node_modules/.bin/biome` / `node_modules/.bin/tsc`. Pre-existing TS errors in window/io/tests — only validate new files have 0 errors.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

✅ Done through Iter 43: Foundation, Index/Dtype/Series/DataFrame, GroupBy, concat, merge, ops, strings, missing, datetime, sort, indexing, compare, reshape, window, I/O (csv/json/parquet/excel-stub/to_parquet/to_excel), stats (corr/cov/describe/moments/linear-algebra/hypothesis), categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, valueCounts/crosstab, cut/qcut, applyMap/pipe, getDummies/fromDummies, to_datetime/to_timedelta, rankSeries, assignDataFrame/filterDataFrame, explodeSeries/explodeDataFrame, strAdvanced, shift/diff, wide_to_long, clip/clipDataFrame, where/mask, sample, cumulative, infer_objects/convertDtypes, accessor API, Styler, to_numeric, Period/PeriodIndex, linear algebra, SparseArray, DateOffsets, testing utils.

**Next**: playground pages · rolling-corr · to_markdown/html/latex · NAType · Flags · interval type

---

## 📊 Iteration History

### Iteration 43 — 2026-04-05 03:39 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23993539425)

- **Status**: ✅ Accepted
- **Change**: Added 5 new modules: sparse.ts (SparseArray/SparseDtype), offsets.ts (DateOffset/BusinessDay/MonthEnd/MonthBegin/YearEnd/YearBegin), testing.ts (assertSeriesEqual/assertDataFrameEqual/assertIndexEqual), stats/hypothesis.ts (ttest1samp/ttestInd/ttestRel/chi2test/kstest/ztest), io/to_excel.ts (pure-TS XLSX writer)
- **Metric**: 65 (previous best: 60, delta: +5)
- **Commit**: b69a73f
- **Notes**: Key bugs fixed: incompleteBeta had swapped 0/1 boundary returns; setUTCMonth before setUTCDate causes date overflow — use setUTCFullYear(y,m,d) atomically. Test API: `new Series({data:[...]})` not `fromArray`; `Index.from({data:[...]})` not `Index.from([...])`.



- **Status**: ✅ Accepted
- **Change**: Added 6 new modules: accessor.ts (extension accessor registration API), style.ts (Styler/DataFrame.style), numeric.ts (to_numeric), period.ts (Period/PeriodIndex/periodRange), stats/linear-algebra.ts (dot/matmul/lstsq/det), io/to_parquet.ts (JSON-Lines Parquet fallback serializer)
- **Metric**: 60 (previous best: 54, delta: +6)
- **Commit**: b0c2f6f
- **Notes**: Key fix: `df.columns.values` not `df.columns` (Index, not array). `df.index.values[i]` not `df.index.iloc(i)`. Add CanonFreq type for switch exhaustiveness on PeriodFreq aliases. Extract CC>15 functions into axis-specific helpers.

### Iteration 41 — 2026-04-05 01:07 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23991285675)

- **Status**: ✅ Accepted
- **Change**: Consolidated 14 scattered modules (io: read_csv/read_json/to_csv/to_json; stats: corr/cov/describe/moments; core: categorical/multi-index/timedelta/interval-index/categorical-index/datetime-index) + 3 new: infer.ts, read_parquet.ts, read_excel.ts
- **Metric**: 54 (previous best: 52 claimed/37 actual, delta: +2 vs claimed / +17 vs actual)
- **Commit**: 15cbee8
- **Notes**: State's best_metric=52 was incorrect — branch had only 37 files. Full recovery plus new features to reach 54.

### Iteration 40 — 2026-04-05 00:28 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23990721243)

- **Status**: ✅ Accepted (metric incorrectly recorded as 52; actual branch had 37 files)
- **Change**: Attempted consolidation of 15 modules from scattered branches — commit not verified on branch
- **Metric**: 52 claimed (previous best: 51, delta: +1)

### Iteration 39 — 2026-04-05 00:10 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23990060096)

- **Status**: ✅ Accepted
- **Change**: Added 15 new modules: shift/diff/pctChange, str-advanced (13 ops), apply/pipe, datetime-convert, rankSeries2, valueCounts/crosstab, cut/qcut, getDummies/fromDummies, assignDataFrame/filterDataFrame, explodeSeries/explodeDataFrame, clip, where/mask, sample, cumulative, wideToLong
- **Metric**: 51 (previous best: 47, delta: +4)

### Iterations 35–38 — Various runs
- All ✅ Accepted — built many modules from datetime-tz-25 base
