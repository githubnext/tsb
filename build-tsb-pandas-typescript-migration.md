# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-09T19:45:00Z |
| Iteration Count | 149 |
| Best Metric | 42 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #81 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 🎯 Current Priorities

**State (iter 149)**: 42 files on PR #81 branch. api_types module added. Next priorities:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/core/accessor_extended.ts` — extended accessor methods for dt/str/cat
- `src/stats/categorical_ops.ts` — standalone categorical helper functions

---

## 📚 Lessons Learned

- **Iter 149 (api_types)**: `isScalar` — primitives + Date only. `isListLike` excludes strings, includes iterables + length objects. `isFloat` — finite number with fractional part (NaN/Infinity → false). `isHashable` — primitives only (objects not hashable in JS sense). Dtype predicates delegate to `Dtype` class methods, `isComplexDtype` always false (no complex type in TS/JS). `isExtensionArrayDtype` = string|object|datetime|timedelta|category.
- **Iter 148 (numeric_extended)**: `digitize` 0-based indices (-1 for below first edge). `histogram` binary-search bin assignment, degenerate range ±0.5 trick. `linspace` last element pinned to exact `stop` to avoid float drift. `arange` uses `start + result.length * step` to avoid accumulation errors. `percentileOfScore` "rank"/"mean" = average of weak+strict. `zscore` propagates null, returns NaN for zero-std. `minMaxNormalize` all-equal → midpoint. `seriesDigitize` wraps `digitize` preserving index.
- **Iter 147 (string_ops_extended)**: `strSplitExpand` uses `n<0` → unlimited splits, `n≥0` → manual loop. `strExtractGroups` parses named group names from `re.source` via `/\(\?<([^>]+)>/g`. `strPartition`/`strRPartition` overloads for scalar→tuple vs array/Series→DataFrame. `strMultiReplace` uses `.withValues()` to preserve Series index. `strDedent` applies per-element.
- **Iter 146 (pipe_apply)**: `pipe` uses TypeScript overloads for 1-8 fns. `dataFrameApply` axis=1 builds row Series. `dataFrameTransformRows` partial update via `c in rowOut` check. `DataFrame.fromColumns(newData, { index: df.index })` preserves index.
- **Iter 145 (string_ops)**: `strGetDummies` sorted tokens. `strExtractAll` JSON-encodes `string[][]`. `instanceof Series` narrowing avoids `as` casts.
- **Iter 144 (attrs)**: WeakMap registry pattern. `withAttrs<T>` preserves concrete type.
- **Iter 143 (rolling_apply)**: Generator-based `windowIterator` yields `{met, nums, raw}`.
- **Iter 142 (notna_isna)**: Module-level overloads. `_dropnaRows` uses `series.iat(i)`.
- **Iter 141 (where_mask)**: `resolveSeriesCond()` handles boolean[], Series<boolean>, callable.
- **Iter 140 (window_extended)**: `rollingSem`=std/√n. `rollingSkew` Fisher-Pearson. `rollingQuantile` 5 interpolation methods.
- **Iter 139 (cut/qcut)**: Binary search in `assignBins()`. `deduplicateEdges()` for uniform data.
- **Iters 119–138**: `__MISSING__` sentinel. `pctChange`, `rollingSem/Skew/Kurt`, `sampleCov(ddof=1)`, `crossCorr`, `wideToLong` anchored regex, `toDictOriented`/`fromDictOriented`.
- **Iters 53–118**: `Index(data,name?)`. `instanceof` dispatch. GroupBy/merge/str/dt, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut, sample, apply, pipe, factorize, crosstab.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 149)**: 42 files. Next: io/read_excel (zero-dep XLSX) · core/accessor_extended · stats/categorical_ops

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 149 — 2026-04-09 19:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24209242279)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/api_types.ts` — 31 exported runtime type-checking predicates mirroring `pandas.api.types`: 16 value-level (`isScalar`, `isListLike`, `isArrayLike`, `isDictLike`, `isIterator`, `isNumber`, `isBool`, `isStringValue`, `isFloat`, `isInteger`, `isBigInt`, `isRegExp`, `isReCompilable`, `isMissing`, `isHashable`, `isDate`) + 15 dtype-level (`isNumericDtype`, `isIntegerDtype`, `isSignedIntegerDtype`, `isUnsignedIntegerDtype`, `isFloatDtype`, `isBoolDtype`, `isStringDtype`, `isDatetimeDtype`, `isTimedeltaDtype`, `isCategoricalDtype`, `isObjectDtype`, `isComplexDtype`, `isExtensionArrayDtype`, `isPeriodDtype`, `isIntervalDtype`). 60+ unit tests + 3 property-based tests. Playground page `api_types.html`.
- **Metric**: 42 (previous best: 41, delta: +1)
- **Commit**: `fdd70ce`
- **Notes**: Dtype predicates delegate cleanly to `Dtype` class methods. `isComplexDtype` always returns false (JS has no complex type). `isFloat` excludes NaN/Infinity (not "float" in the pandas sense). `isHashable` restricted to primitives (objects not safely hashable as dict keys in JS).

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/numeric_extended.ts` — 9 numpy/scipy-style numeric utility functions: `digitize` / `seriesDigitize` (bin values into intervals), `histogram` (frequency counts with density option), `linspace` / `arange` (number sequence generators), `percentileOfScore` (4 ranking kinds), `zscore` (z-score standardisation with ddof), `minMaxNormalize` (scale to custom range), `coefficientOfVariation` (std/|mean|). 55 unit tests + 4 property-based tests. Playground page `numeric_extended.html`.
- **Metric**: 41 (previous best: 40, delta: +1)
- **Commit**: `7969a3d`
- **Notes**: `arange` uses `start + result.length * step` accumulation pattern to avoid float drift. `linspace` pins last element to exact `stop`. `digitize` 0-based (−1 for below-first-edge). `minMaxNormalize` all-equal → midpoint of target range.

### Iteration 147 — 2026-04-09 18:24 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24206383170)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/string_ops_extended.ts` — 7 standalone advanced string operations: `strSplitExpand` (split → DataFrame columns, mirrors `str.split(expand=True)`), `strExtractGroups` (regex capture groups → DataFrame, mirrors `str.extract`), `strPartition` / `strRPartition` (split at first/last sep → tuple or DataFrame), `strMultiReplace` (batch find/replace), `strIndent` / `strDedent` (line-level indentation, mirrors textwrap). 50+ unit tests + 4 property-based tests. Playground page `string_ops_extended.html`.
- **Metric**: 40 (previous best: 39, delta: +1)
- **Commit**: `a78aead`
- **Notes**: Named groups parsed from `re.source` via `/\(\?<([^>]+)>/g`. `strDedent` applies per-element (each element dedented independently). `strMultiReplace` uses `.withValues()` on Series to preserve index.

### Iteration 146 — 2026-04-09 17:52 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24204988345)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/pipe_apply.ts` — 7 exported functions: `pipe` (variadic type-safe pipeline, 8 overloads), `seriesApply` (element-wise with value/label/pos context), `seriesTransform` (scalar→scalar), `dataFrameApply` (column-wise/row-wise aggregation, axis 0/1), `dataFrameApplyMap` (cell-wise, mirrors applymap), `dataFrameTransform` (column-wise transform), `dataFrameTransformRows` (row-wise with partial updates). 50+ unit tests + 4 property-based tests. Playground page `pipe_apply.html`.
- **Metric**: 39 (previous best: 38, delta: +1)
- **Commit**: `3d42458`
- **Notes**: `pipe` overloads preserve precise return types up to 8 steps. `dataFrameTransformRows` partial update pattern (only return keys to change, others kept) is very ergonomic. `DataFrame.fromColumns(data, { index: df.index })` is the right way to preserve row labels when building a new DataFrame.

### Iteration 145 — 2026-04-09 17:27 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24203932812)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/string_ops.ts` — 8 standalone string operation functions: `strNormalize`, `strGetDummies`, `strExtractAll`, `strRemovePrefix`, `strRemoveSuffix`, `strTranslate`, `strCharWidth`, `strByteLength`. 50+ unit tests + 5 property-based tests. Playground page `string_ops.html`.
- **Metric**: 38 (previous best: 37, delta: +1)
- **Commit**: `f906316`

### Iters 139–144 — ✅ (metrics 32→37): cut_qcut, window_extended, where_mask, notna_isna, rolling_apply, attrs
### Iters 103–138 — ✅ (metrics 25→31): insert_pop, to_from_dict/wide_to_long, assign, clip_with_bounds, pivotTableFull, infer_dtype, dropna, combine_first, natsort, searchsorted, valueCountsBinned, duplicated, reindex, align, explode, isin, between, unique/nunique, pct_change, replace, map/transform, read_fwf, mode, autocorr, abs/round, rolling_moments, covariance, rolling_cross_corr, cut_extended, astype, idxminmax, convert_dtypes
### Iters 53–102 — ✅ (metrics 8→24): named_agg, select_dtypes, memory_usage, Timestamp, to_numeric, json_normalize, wide_to_long, crosstab, get_dummies, factorize, datetime_tz, numeric_ops, DateOffset, date_range, where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, Foundation+GroupBy+merge+str+dt+describe+csv/json+corr+rolling+expanding+ewm+stack/unstack+melt/pivot+value_counts+MultiIndex
### Iterations 1–52 — ✅ Earlier work on diverged branches
