# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-05T05:55:00Z |
| Iteration Count | 45 |
| Best Metric | 75 |
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

Iter 45 complete (75 files). Added: io/to_string.ts, core/option.ts, core/json.ts, core/eval.ts.

Next candidates:
- Playground pages for new modules (sparse, offsets, testing, hypothesis, excel, na-type, markdown, html, latex, to_string, option, json, eval)
- `src/core/arrow.ts` — Apache Arrow interop (+1)
- `src/io/read_clipboard.ts` — pd.read_clipboard / to_clipboard (+1)
- `src/core/pipe.ts` — DataFrame.pipe() / Series.pipe() method chaining (+1)
- `src/core/applymap.ts` — DataFrame.applymap() element-wise apply (+1)
- `src/io/sql.ts` — pd.read_sql / to_sql stub (+1)
- `src/core/io_formats.ts` — pd.read_fwf (fixed-width format) (+1)
- `src/window/expanding-corr.ts` — expanding window correlation/covariance (+1)
- `src/stats/bootstrap.ts` — bootstrap confidence intervals (+1)

---

## 📚 Lessons Learned

- **Iter 45 (4 new modules, 71→75)**: Added to_string.ts (fixed-width text tables — extract buildColLayout/buildIndexInfo/buildDataLines helpers to keep dataFrameToString CC≤15), option.ts (global option registry — inline validator lambdas need `(v): void =>` explicit return type), json.ts (json_normalize + flattenJson — recursive `JsonValue` type alias needs `interface JsonObject` indirection to avoid TS2456 circular reference; core files import sibling files directly e.g. `./frame.ts`, NOT `../core/index.ts` which is circular), eval.ts (expression evaluator — comparison ops need null guard + `as number | string` cast since `Scalar` includes null/undefined). Key patterns: `push_to_pull_request_branch` needs local branch tracking remote (checkout remote branch, cherry-pick, then push).
- **Iter 44 (6 new modules, 65→71)**: Added na-type.ts (NAType/NA singleton with Kleene three-valued logic — and/or/not propagation, naIf/naOr helpers), flags.ts (Flags class with allows_duplicate_labels + DuplicateLabelError — biome noSecrets false-positive on class name string requires inline disable), io/to_markdown.ts (GFM pipe table renderer with alignment and floatPrecision), io/to_html.ts (HTML table with thead/tbody, maxRows truncation, fullDocument wrapping, HTML escaping), io/to_latex.ts (tabular/longtable with caption/label — CC>15 fixed by extracting buildBeginLines + buildDataRow helpers; noSecrets false-positive on \\textasciitilde{} needs inline disable), stats/pairwise.ts (pairwiseCorr/pairwiseCov square matrices, corrwith column-wise, rollingCorr/rollCov). Key API: `Index.values[i]` not `Index.iloc(i)` — Index has no iloc. Biome import restrictions: io/stats files must import from `../core/index.ts` not `../core/frame.ts` etc. Template literal `}:` syntax confuses TSC — use helper function for separator cells.
- **Iter 43 (5 new modules, 60→65)**: Added sparse.ts (SparseArray/SparseDtype with COO storage, binarySearch, fill-value semantics), offsets.ts (DateOffset/BusinessDay/MonthEnd/MonthBegin/YearEnd/YearBegin/dateRange — key bug: use setUTCFullYear(year, month, day) atomically to avoid intermediate date overflow), testing.ts (assertSeriesEqual/assertDataFrameEqual/assertIndexEqual/AssertionError), stats/hypothesis.ts (ttest1samp/ttestInd/ttestRel/chi2test/kstest/ztest — key bugs: incompleteBeta boundary values were swapped 0↔1; degenerate case sd=0 returns t=0,p=1), io/to_excel.ts (pure-TS XLSX writer with embedded PKZip and CRC-32, no deps). Key API reminders: Series uses `new Series({data:[...]})` not `fromArray`; Index uses `.size` not `.length`; Index.from takes `{data:[...]}` not an array.
- **Iter 40 (37→52)**: Used `git show <branch>:<file>` to extract files from old scattered branches. `safeoutputs-create_pull_request` works with local branches not tracking remote. Biome `--unsafe --write` fixes block statement warnings.
- **Iter 39 (47→51)**: Cherry-pick from iter39 branch onto window-17 PR branch. `push_to_pull_request_branch` requires local branch to track existing remote ref.
- **General**: `exactOptionalPropertyTypes`: use `?? null`. `noUncheckedIndexedAccess`: guard array accesses. CC≤15: extract helpers. `useTopLevelRegex`: move regex to top. `useNumberNamespace`: `Number.NaN`. `import fc from "fast-check"` (default). `useForOf` requires for-of.
- **Imports**: tests import from `../../src/index.ts`; src/io/stats import from `../core/index.ts`; src/core files import siblings directly (e.g. `./frame.ts`). `import type` for type-only.
- **Build env**: bun not available — use `npm install` then `node_modules/.bin/biome` / `node_modules/.bin/tsc`. Pre-existing TS errors in some files — only validate new files have 0 errors.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

✅ Done through Iter 45: Foundation, Index/Dtype/Series/DataFrame, GroupBy, concat, merge, ops, strings, missing, datetime, sort, indexing, compare, reshape, window, I/O (csv/json/parquet/excel-stub/to_parquet/to_excel/to_markdown/to_html/to_latex/to_string), stats (corr/cov/describe/moments/linear-algebra/hypothesis/pairwise), categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, valueCounts/crosstab, cut/qcut, applyMap/pipe, getDummies/fromDummies, to_datetime/to_timedelta, rankSeries, assignDataFrame/filterDataFrame, explodeSeries/explodeDataFrame, strAdvanced, shift/diff, wide_to_long, clip/clipDataFrame, where/mask, sample, cumulative, infer_objects/convertDtypes, accessor API, Styler, to_numeric, Period/PeriodIndex, linear algebra, SparseArray, DateOffsets, testing utils, NAType/NA, Flags, option registry, json_normalize, eval/query DSL.

**Next**: playground pages · Arrow interop · pipe/applymap · read_fwf · bootstrap stats

---

## 📊 Iteration History

### Iteration 45 — 2026-04-05 05:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23995170513)

- **Status**: ✅ Accepted
- **Change**: Added 4 modules: io/to_string.ts (fixed-width text output), core/option.ts (get/set/reset_option registry), core/json.ts (json_normalize/flattenJson), core/eval.ts (expression evaluator + queryDataFrame)
- **Metric**: 75 (previous best: 71, delta: +4)
- **Commit**: 532a2aa
- **Notes**: Recursive type alias `JsonValue` needs interface indirection to avoid TS2456. Comparison operators with `Scalar` (which includes null) need null guards + `as number | string` cast. Core files import from sibling files directly (e.g. `./frame.ts`), not from `../core/index.ts` (which is circular).

- **Status**: ✅ Accepted
- **Change**: Added 6 new modules: na-type.ts (NAType/NA singleton + three-valued logic), flags.ts (Flags/DuplicateLabelError), io/to_markdown.ts, io/to_html.ts, io/to_latex.ts, stats/pairwise.ts (pairwiseCorr/pairwiseCov/corrwith/rollingCorr/rollCov)
- **Metric**: 71 (previous best: 65, delta: +6)
- **Commit**: f0803b7
- **Notes**: Index has no `.iloc()` — use `.values[i]`. Import from `../core/index.ts` not sub-files. Template literal ending `}:` confuses TSC — extract helper fn. Biome noSecrets false-positives on class-name strings and LaTeX escape sequences.

### Iteration 43 — 2026-04-05 03:39 UTC — ✅ sparse.ts, offsets.ts, testing.ts, hypothesis.ts, to_excel.ts — 65 (+5)
### Iteration 42 — 2026-04-05 02:15 UTC — ✅ accessor.ts, style.ts, numeric.ts, period.ts, linear-algebra.ts, to_parquet.ts — 60 (+6)
### Iteration 41 — 2026-04-05 01:07 UTC — ✅ Consolidated 14 scattered modules + infer.ts, read_parquet.ts, read_excel.ts — 54 (+17)
### Iterations 1–40 — ✅ All accepted — built Foundation/Index/Series/DataFrame/GroupBy/merge/concat/ops/strings/missing/datetime/sort/indexing/compare/reshape/window/I/O/stats/categorical/MultiIndex/Timedelta/IntervalIndex/CategoricalIndex/DatetimeIndex/cut/qcut/etc.
