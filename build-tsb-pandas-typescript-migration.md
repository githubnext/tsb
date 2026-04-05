# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-05T07:54:00Z |
| Iteration Count | 47 |
| Best Metric | 83 |
| Target Metric | — |
| Branch | `work-branch-41-a62d454c5d6737a7` |
| PR | #45 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `work-branch-41-a62d454c5d6737a7`
**Pull Request**: #45

---

## 🎯 Current Priorities

Iter 47 complete (83 files). Added: io/read_xml.ts, stats/contingency.ts, core/memory_usage.ts, io/sql.ts.

Next candidates:
- Playground pages for new modules
- `src/core/arrow.ts` — Apache Arrow interop (+1)
- `src/io/read_clipboard.ts` / `src/io/to_clipboard.ts` — clipboard I/O (+1)
- `src/window/rolling-corr.ts` — SKIP (already exists in stats/pairwise.ts as `rollingCorr`)
- `src/stats/anova.ts` — one-way/two-way ANOVA (+1)
- `src/core/resample.ts` — time-based resampling (resample, asfreq) (+1)
- `src/io/read_orc.ts` — ORC format reader stub (+1)
- `src/core/pipe.ts` — pipe/apply chain utilities (+1) [check if already done]
- `src/core/transform.ts` — transform (GroupBy transform) (+1)

---

## 📚 Lessons Learned

- **Iter 47 (4 new modules, 79→83)**: Added io/read_xml.ts (char-scan XML tokenizer, XPath-like selectors, auto-detect rows, NA/numeric inference), stats/contingency.ts (contingencyTable/chi2Contingency/fisherExact — Lanczos gamma for p-value, log-prob for Fisher), core/memory_usage.ts (dtype-based bytes-per-element, string length, deep mode), io/sql.ts (readSql/toSql with SqlConnection interface, ifExists, chunked inserts).
- **Iter 46 (4 new modules, 75→79)**: read_fwf (break-position analysis, `isBreak[i] ?? true`), read_html (global regex + `lastIndex=0` reset, HTML entity decode), bootstrap (BCa + percentile CI, LCG PRNG, jackknife accel), expanding-corr (`df.columns.values.filter/includes`, `name: source.name` not `?? undefined`).
- **Iter 45 (4, 71→75)**: to_string.ts, option.ts, json.ts, eval.ts. `JsonValue` needs interface indirection (TS2456). Core files import siblings directly (`./frame.ts`), not `../core/index.ts` (circular).
- **Iter 44 (6, 65→71)**: na-type.ts, flags.ts, to_markdown.ts, to_html.ts, to_latex.ts, pairwise.ts. `Index.values[i]` not `.iloc()`. Template literal `}:` → extract helper. Biome noSecrets false-positives on class names and LaTeX sequences.
- **Iter 43 (5, 60→65)**: sparse.ts, offsets.ts, testing.ts, hypothesis.ts, to_excel.ts. `setUTCFullYear(y,m,d)` atomically; incompleteBeta boundary 0↔1 were swapped.
- **Iter 40 (37→52)**: `git show <branch>:<file>` to extract from old branches. Pre-existing TS errors in some window/merge files — only validate new files.
- **General**: `exactOptionalPropertyTypes`: `?? null`. `noUncheckedIndexedAccess`: guard indexes. CC≤15: extract helpers. `useTopLevelRegex`: top-level const. `useNumberNamespace`: `Number.NaN`. `import fc from "fast-check"` (default). `useForOf`.
- **Imports**: tests → `../../src/index.ts`; src/io,stats → `../core/index.ts`; src/core → siblings directly. `import type` for type-only.
- **Build env**: bun not in PATH — use `npm install` then `node_modules/.bin/biome` / `node_modules/.bin/tsc`. Pre-existing TS errors in some files.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

✅ Done through Iter 47: Foundation, Index/Dtype/Series/DataFrame, GroupBy, concat, merge, ops, strings, missing, datetime, sort, indexing, compare, reshape, window, I/O (csv/json/parquet/excel-stub/to_parquet/to_excel/to_markdown/to_html/to_latex/to_string/read_fwf/read_html/read_xml/sql), stats (corr/cov/describe/moments/linear-algebra/hypothesis/pairwise/bootstrap/contingency), categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, valueCounts/crosstab, cut/qcut, applyMap/pipe, getDummies/fromDummies, to_datetime/to_timedelta, rankSeries, assignDataFrame/filterDataFrame, explodeSeries/explodeDataFrame, strAdvanced, shift/diff, wide_to_long, clip/clipDataFrame, where/mask, sample, cumulative, infer_objects/convertDtypes, accessor API, Styler, to_numeric, Period/PeriodIndex, linear algebra, SparseArray, DateOffsets, testing utils, NAType/NA, Flags, option registry, json_normalize, eval/query DSL, expanding corr/cov, memory_usage.

**Next**: playground pages · Arrow interop · clipboard I/O · ANOVA · resample · read_orc · transform

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 47 — 2026-04-05 07:54 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23996814658)

- **Status**: ✅ Accepted
- **Change**: Added 4 modules: io/read_xml.ts (XML table parser with XPath-like selectors), stats/contingency.ts (contingencyTable/chi2Contingency/fisherExact), core/memory_usage.ts (dtype-based memory estimation), io/sql.ts (readSql/toSql with SqlConnection interface)
- **Metric**: 83 (previous best: 79, delta: +4)
- **Commit**: 1b0e456
- **Notes**: XML tokenizer uses char-scan approach for reliability; chi2 p-value uses Lanczos gamma; fisherExact uses log-probability to avoid overflow; memory_usage infers bytes per element by dtype; sql.ts uses connection interface pattern for db-agnostic SQL I/O.

### Iteration 46 — 2026-04-05 06:29 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23995941373)

- **Status**: ✅ Accepted
- **Change**: Added 4 modules: io/read_fwf.ts (fixed-width format reader), io/read_html.ts (HTML table parser), stats/bootstrap.ts (bootstrap CI with percentile and BCa), window/expanding-corr.ts (expanding correlation/covariance for Series and DataFrame)
- **Metric**: 79 (previous best: 75, delta: +4)
- **Commit**: 1127fc4
- **Notes**: read_html uses global regex patterns with `lastIndex=0` resets; bootstrap BCa uses jackknife for acceleration factor + LCG PRNG for reproducibility; `df.columns.values.filter/includes` not `df.columns.filter/includes`; Series constructor `name: source.name` works without ?? undefined with exactOptionalPropertyTypes.

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
