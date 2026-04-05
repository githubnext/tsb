# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-05T07:51:00Z |
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

Iter 47 complete (83 files). Added: window/rolling-corr.ts, stats/contingency.ts, core/memory_usage.ts, io/read_xml.ts.

Next candidates:
- Playground pages for new modules (sparse, offsets, testing, hypothesis, excel, na-type, markdown, html, latex, to_string, option, json, eval, read_fwf, read_html, bootstrap, expanding-corr, rolling-corr, contingency, memory_usage, read_xml)
- `src/core/arrow.ts` — Apache Arrow interop (+1)
- `src/io/read_clipboard.ts` — pd.read_clipboard (+1)
- `src/io/sql.ts` — pd.read_sql / to_sql stub (+1)
- `src/stats/information.ts` — mutual_info_score, entropy, KL divergence (+1)
- `src/core/pipe.ts` — pipe() / apply() chain utilities (+1)
- `src/io/to_clipboard.ts` — to_clipboard (+1)
- `src/core/flags.ts` already done; `src/core/attrs.ts` — DataFrame.attrs dict (+1)

---

## 📚 Lessons Learned

- **Iter 47 (4 new modules, 79→83)**: Added rolling-corr.ts, contingency.ts, memory_usage.ts, read_xml.ts. Key: `noAssignInExpressions` — use `m=exec(); while(m!==null){...m=exec();}`. `DataFrame.fromRecords([])` not `fromRows`. CC≤15: extract helpers (processOpenTag/chi2Cell/resolveHtmlHeaders/detectColumns). `Number.POSITIVE_INFINITY`. Template literal test fixtures: use builder functions with `${var}` interpolation.
- **Iter 46 (75→79)**: read_fwf.ts, read_html.ts, bootstrap.ts, expanding-corr.ts. Global regex lastIndex=0 resets.
- **Iter 45 (71→75)**: to_string.ts, option.ts, json.ts, eval.ts. JsonValue needs interface indirection.
- **Iter 44 (65→71)**: na-type.ts, flags.ts, to_markdown.ts, to_html.ts, to_latex.ts, pairwise.ts. Index.values[i] not iloc; import from ../core/index.ts.
- **Iter 43 (60→65)**: sparse.ts, offsets.ts, testing.ts, hypothesis.ts, to_excel.ts. setUTCFullYear atomic. Series `new Series({data:[]})`.
- **Iter 40 (37→52)**: git show branch:file for old scattered branches. Biome --unsafe fixes.
- **General**: `exactOptionalPropertyTypes` → `?? null`. `noUncheckedIndexedAccess` → guard. CC≤15 → helpers. `useTopLevelRegex`. `Number.NaN`. `import fc from "fast-check"`.
- **Imports**: tests → `../../src/index.ts`; io/stats → `../core/index.ts`; core → sibling directly.
- **Build env**: bun not available — npm install, then node_modules/.bin/biome / tsc. Pre-existing TS errors in other files are ok.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

✅ Done through Iter 47: Foundation, Index/Dtype/Series/DataFrame, GroupBy, concat, merge, ops, strings, missing, datetime, sort, indexing, compare, reshape, window, I/O (csv/json/parquet/excel-stub/to_parquet/to_excel/to_markdown/to_html/to_latex/to_string/read_fwf/read_html/read_xml), stats (corr/cov/describe/moments/linear-algebra/hypothesis/pairwise/bootstrap/contingency), categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, valueCounts/crosstab, cut/qcut, applyMap/pipe, getDummies/fromDummies, to_datetime/to_timedelta, rankSeries, assignDataFrame/filterDataFrame, explodeSeries/explodeDataFrame, strAdvanced, shift/diff, wide_to_long, clip/clipDataFrame, where/mask, sample, cumulative, infer_objects/convertDtypes, accessor API, Styler, to_numeric, Period/PeriodIndex, linear algebra, SparseArray, DateOffsets, testing utils, NAType/NA, Flags, option registry, json_normalize, eval/query DSL, expanding corr/cov, rolling corr/cov, memory_usage.

**Next**: playground pages · Arrow interop · read_sql/to_sql · read_clipboard/to_clipboard · information theory stats · attrs dict

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 47 — 2026-04-05 07:51 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23997169941)

- **Status**: ✅ Accepted
- **Change**: Added 4 modules: window/rolling-corr.ts (rolling Pearson corr/cov + DataFrame pairwise), stats/contingency.ts (chi2Contingency/fisherExact/cramersV/phiCoefficient/expectedFreq), core/memory_usage.ts (heuristic byte estimator for Series/DataFrame), io/read_xml.ts (XML parser with HTML-table and row-element modes)
- **Metric**: 83 (previous best: 79, delta: +4)
- **Commit**: 1c70631
- **Notes**: noAssignInExpressions: use `m = exec(); while (m !== null) { ... m = exec(); }` not `while ((m = exec()) !== null)`. `DataFrame.fromRecords([])` for empty. CC≤15: extract helpers (processOpenTag, chi2Cell, resolveHtmlHeaders, detectColumns, etc.). `Number.POSITIVE_INFINITY` not `Infinity`. Template literal test fixtures: use function-builders with interpolation.

### Iteration 46 — 2026-04-05 06:29 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23995941373)

- **Status**: ✅ Accepted
- **Change**: Added 4 modules: io/read_fwf.ts (fixed-width format reader), io/read_html.ts (HTML table parser), stats/bootstrap.ts (bootstrap CI with percentile and BCa), window/expanding-corr.ts (expanding correlation/covariance for Series and DataFrame)
- **Metric**: 79 (previous best: 75, delta: +4)
- **Commit**: 1127fc4
- **Notes**: read_html uses global regex patterns with `lastIndex=0` resets; bootstrap BCa uses jackknife for acceleration factor + LCG PRNG for reproducibility; `df.columns.values.filter/includes` not `df.columns.filter/includes`; Series constructor `name: source.name` works without ?? undefined with exactOptionalPropertyTypes.

### Iteration 45 — 2026-04-05 05:55 UTC — ✅ to_string.ts, option.ts, json.ts, eval.ts — 75 (+4)
### Iteration 44 — ✅ na-type.ts, flags.ts, to_markdown.ts, to_html.ts, to_latex.ts, pairwise.ts — 71 (+6)
### Iteration 43 — 2026-04-05 03:39 UTC — ✅ sparse.ts, offsets.ts, testing.ts, hypothesis.ts, to_excel.ts — 65 (+5)
### Iteration 42 — 2026-04-05 02:15 UTC — ✅ accessor.ts, style.ts, numeric.ts, period.ts, linear-algebra.ts, to_parquet.ts — 60 (+6)
### Iteration 41 — 2026-04-05 01:07 UTC — ✅ Consolidated 14 scattered modules + infer.ts, read_parquet.ts, read_excel.ts — 54 (+17)
### Iterations 1–40 — ✅ All accepted — built Foundation/Index/Series/DataFrame/GroupBy/merge/concat/ops/strings/missing/datetime/sort/indexing/compare/reshape/window/I/O/stats/categorical/MultiIndex/Timedelta/IntervalIndex/CategoricalIndex/DatetimeIndex/cut/qcut/etc.
