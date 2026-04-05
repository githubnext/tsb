# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-05T12:49:00Z |
| Iteration Count | 55 |
| Best Metric | 10 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #48 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration`
**Pull Request**: #48

---

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch `autoloop/build-tsb-pandas-typescript-migration` from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Next candidates (continue building from the current 10-file baseline):
- `src/core/datetime_accessor.ts` — Series.dt accessor (calendar components, strftime)
- `src/stats/describe.ts` — describe() with percentiles
- `src/io/json.ts` — read_json / to_json
- `src/io/csv.ts` — add readCsv/toCsv (already on main branch)

---

## 📚 Lessons Learned

- **Iter 55 (string_accessor, 9→10)**: `StringSeriesLike` interface must include `str: StringAccessor` and `toArray()` to avoid circular deps while still being strongly typed in tests. Move all regex to top-level constants (Biome useTopLevelRegex). Extract sub-functions from `stripChars`/`doReplace` to keep CC≤15. Use `charAt(0)` instead of `s[0]!` to avoid noNonNullAssertion. No `as` casts needed since `withValues()` returns `Series<Scalar>`.
- **Iter 54 (2 modules, 6→8, new branch)**: Main branch was reset to 6 files. New long-running branch created. GroupBy: `DataFrameGroupBy/SeriesGroupBy` with all agg methods + apply/transform. CSV I/O: `readCsv/toCsv` with full option set. Biome `useImportRestrictions` requires barrel files (src/groupby/index.ts, src/io/index.ts) — modules must import via directory index. `splitLine` CC > 15 → extract `stepInsideQuote`. `readCsv` CC > 15 → extract `filterLines / resolveNamesAndData / parseDataLines`.
- **Iter 52 (5 modules, 96→101)**: survival.ts: `sortedEvents` helper reduces CC; all-zero numerator gives hazard=0 cleanly. timeseries.ts: `normAcv()` extracted to avoid nested ternary; `ldStep()` extracted from `levinsonDurbin` to satisfy CC≤15; ACF/PACF require symmetric Toeplitz construction. factor.ts: `leadingSingular` + `deflate` pattern for incremental SVD; `noUncheckedIndexedAccess` requires every `arr[i]` to have `?? 0` guard. bayesian.ts: all conjugate update functions are ~4 LOC; returning structured `BetaParams/NormalParams/etc` avoids `as` casts. style_advanced.ts: needed `Styler._df` + `_styles` + `_addStyle` to be `protected` (not private); `_applyByCol` / `_applyByRow` pattern satisfies CC≤15 for nested loops.
- **Iter 51 (5 modules, 91→96)**: core/plotting.ts (`import type {Series/DataFrame}` avoids circular; `setPlotRenderer(null)` clears). core/arrow.ts (`readonly T[]` not ReadonlyArray; block statements; import sorting). core/window_apply.ts (`name: s.name ?? null` for exactOptionalPropertyTypes). io/read_sas.ts + io/read_spss.ts (injectable decoder stubs). Test mock: `decode: (): SasResult => result` for `useExplicitType`.
- **Iter 50 (6 modules, 87→93)**: State stale (claimed 91, branch had 87). io/clipboard.ts (`CARRIAGE_RETURN_RE` top-level; `biome-ignore noSecrets`). `DataFrame.fromColumns({})` not `new DataFrame({data:{}})`. `meta["key"]` bracket notation.
- **Iter 48 (4 modules, 83→87)**: anova.ts CC>15 → extract helpers. resample.ts: RULE_REGEX top-level, `.at(-1)`, block statements.
- **Iter 47 (4 modules, 79→83)**: read_xml char-scan tokenizer. contingency Lanczos gamma. memory_usage dtype bytes. sql SqlConnection interface.
- **Iter 46 (4 modules, 75→79)**: read_fwf `isBreak[i] ?? true`. read_html global regex + `lastIndex=0`. bootstrap LCG PRNG. expanding-corr `name: source.name`.
- **Iter 45 (4, 71→75)**: `JsonValue` interface indirection (TS2456). Core → siblings directly (circular).
- **Iter 40+ (misc)**: `git show <branch>:<file>` for old branches. Pre-existing TS errors in window/merge — only validate new files.
- **General**: `exactOptionalPropertyTypes`: `?? null`. `noUncheckedIndexedAccess`: guard indexes. CC≤15: extract helpers. `useTopLevelRegex`. `useNumberNamespace: Number.NaN`. `import fc from "fast-check"` (default). `useForOf`. `import type` for type-only. `bun not in PATH` — use `node_modules/.bin/bun` (installed as npm package in project). Row ordering in join/merge results is unordered — sort before asserting exact order in tests.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

✅ Done through Iter 52 on old branches (not merged to main): Foundation, Index/Dtype/Series/DataFrame, GroupBy, concat, merge, ops, strings, missing, datetime, sort, indexing, compare, reshape, window, I/O (csv/json/parquet/excel/fwf/html/xml/sql/orc/feather/clipboard/sas/spss), stats (corr/cov/describe/moments/linalg/hypothesis/pairwise/bootstrap/contingency/anova/kruskal/regression/survival/timeseries/factor/bayesian), categorical, MultiIndex, Timedelta, IntervalIndex, CategoricalIndex, DatetimeIndex, valueCounts/crosstab, cut/qcut, applyMap/pipe, getDummies, to_datetime, rank, assign, explode, strAdvanced, shift/diff, wide_to_long, clip, where, sample, cumulative, infer_objects, accessor API, Styler/AdvancedStyler, to_numeric, Period, SparseArray, DateOffsets, testing utils, NAType, Flags, options, json_normalize, eval/query, expanding corr/cov, memory_usage, resample, plotting API, arrow.

**New branch baseline (iter 53)**: 8 files — Series, DataFrame, GroupBy, CSV I/O + core infrastructure.
**Iter 54**: merge.ts added (9 files). merge/concat both done.
**Iter 55**: string_accessor.ts added (10 files). Series.str fully implemented.

**Next on new branch**: string accessor · datetime accessor · stats/describe · json I/O · resample

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 55 — 2026-04-05 12:49 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24001823414)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/string_accessor.ts` — `Series.str` accessor with 35+ vectorised string methods: case (lower/upper/title/capitalize/swapcase), len, strip/lstrip/rstrip/pad/ljust/rjust/center/zfill, contains/startswith/endswith/match/fullmatch, find/rfind/count, replace/extract, split/rsplit/join/cat, slice/get/sliceReplace, repeat/wrap/encode, isalpha/isdigit/isalnum/islower/isupper/istitle/isspace. All methods null-propagating. Added `withValues()` to Series.
- **Metric**: 10 (previous: 9, delta: +1)
- **Commit**: 5f42c0c
- **Notes**: `StringSeriesLike` interface needed `str` and `toArray()` to avoid circular deps. Top-level regex consts required by Biome. `stripChars` split into `stripWhitespace + stripCharSet` to reduce CC. `doReplace` split into `replaceAll + replaceN + buildReplaceRegex`.

### Iteration 54 — 2026-04-05 12:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24001239424)

- **Status**: ✅ Accepted
- **Change**: Added `src/merge/merge.ts` — full `merge()` function with inner/left/right/outer joins, `on`/`left_on`/`right_on`/`left_index`/`right_index`, suffix handling for overlapping columns, `sort` option. 29 tests + property-based tests. Playground page.
- **Metric**: 9 (previous: 8, delta: +1)
- **Commit**: d61b790
- **Notes**: `import type { Index }` since Index is type-only in merge.ts. Biome format requires single-line short function signatures. Row ordering in join results is non-deterministic (matched first, unmatched appended) — tests use `.sort()` not ordered equality.

### Iteration 53 — 2026-04-05 11:43 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24000770925)

- **Status**: ✅ Accepted
- **Change**: New branch `autoloop/build-tsb-pandas-typescript-migration` created from main (6 files). Added `src/groupby/groupby.ts` (DataFrameGroupBy + SeriesGroupBy with sum/mean/min/max/count/std/var/median/first/last/size/apply/transform) and `src/io/csv.ts` (readCsv + toCsv with full option sets). Barrel files for import restrictions.
- **Metric**: 8 (previous: 6 on main, delta: +2)
- **Commit**: 9e9045b
- **Notes**: Main branch reset to 6 files — previous iterations' branches were not merged. Required barrel files per Biome useImportRestrictions. splitLine → stepInsideQuote helper reduces CC. readCsv split into 3 helpers.

### Iteration 52 — 2026-04-05 11:11 UTC — ✅ survival/timeseries/factor/bayesian/style_advanced — 96→101 (old branch)
### Iteration 51 — 2026-04-05 11:00 UTC — ✅ plotting/arrow/window_apply/read_sas/read_spss — 91→96 (old branch)
### Iteration 50 — 2026-04-05 10:12 UTC — ✅ kruskal/regression/clipboard/plotting/read_sas/read_spss — 87→93 (old branch)

### Iteration 49 — 2026-04-05 09:30 UTC — ✅ kruskal/regression/clipboard/plotting — 87→91 (push failed)
### Iteration 48 — 2026-04-05 08:15 UTC — ✅ anova/resample/read_orc/read_feather — 83→87
### Iteration 47 — 2026-04-05 07:54 UTC — ✅ read_xml/contingency/memory_usage/sql — 79→83
### Iteration 46 — 2026-04-05 06:29 UTC — ✅ read_fwf/read_html/bootstrap/expanding-corr — 75→79
### Iterations 1–45 — ✅ Foundation through eval/query/expanding-corr/resample (see prior history)

