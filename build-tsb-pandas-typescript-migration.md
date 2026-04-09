# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-09T17:52:06Z |
| Iteration Count | 146 |
| Best Metric | 39 |
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

**State (iter 146)**: 39 files on PR #81 branch. pipe_apply module added. Next priorities:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/stats/string_ops_extended.ts` — additional string ops (extractAll to DataFrame, etc.)
- `src/core/accessor_extended.ts` — extended accessor methods (dt.round, str.decode, cat.rename_categories)

---

## 📚 Lessons Learned

- **Iter 146 (pipe_apply)**: `pipe` uses TypeScript overloads for 1-8 fns with precise return type at each step; the implementation signature uses `ReadonlyArray<(x: unknown) => unknown>` which matches all overloads. `dataFrameApply` axis=1 builds row Series with column names as index using `[...colNames]` spread. `dataFrameTransformRows` merges partial row updates using `c in rowOut` check — missing keys default to original value. `DataFrame.fromColumns(newData, { index: df.index })` preserves the original index.
- **Iter 145 (string_ops)**: Standalone string ops module. `strGetDummies` uses sorted unique tokens from first-seen order for stable column naming. `strExtractAll` stores matches as JSON-encoded `string[][]` (fits in Scalar; consumers `JSON.parse`). `strCharWidth` covers CJK/Hangul/fullwidth ranges. `instanceof Series` narrowing avoids `as` casts. `strRemovePrefix`/`strRemoveSuffix` use TypeScript overloads for scalar vs array/Series dispatch.
- **Iter 144 (attrs)**: WeakMap registry pattern for out-of-band metadata. `withAttrs<T>(obj, attrs): T` preserves the concrete type for type-safe fluent API. `mergeAttrs` left-to-right merge with later-source-wins. `deleteAttr` cleans up the registry entry when last key removed. No class modification needed — works entirely via module-level functions.
- **Iter 143 (rolling_apply)**: `rollingApply` standalone with `minPeriods`/`center`/`raw` options. `rollingAgg` applies multiple named fns in one pass → DataFrame. `dataFrameRollingAgg` flattens to `{col}_{aggName}` columns. Generator-based `windowIterator` yields `{met, nums, raw}` per position. TypeScript generator with explicit yield type works cleanly.
- **Iter 142 (notna_isna)**: Module-level `isna`/`notna`/`isnull`/`notnull` via TypeScript overloads. `fillna`/`dropna` dispatch by `instanceof`. `_dropnaRows` uses `series.iat(i)`. `countna`/`countValid` avoid intermediate Series allocation.
- **Iter 141 (where_mask)**: `resolveSeriesCond()` handles boolean[], Series<boolean>, callable. `resolveDataFrameCond()` aligns by column name + row label. `df.columns.values` (string[]) not `df.columns` (Index) for typed keys.
- **Iter 140 (window_extended)**: `rollingSem`=std/√n (n≥2). `rollingSkew` Fisher-Pearson (n≥3), constant→0. `rollingKurt` (n≥4). `rollingQuantile` 5 interpolation methods. Standalone module pattern.
- **Iter 139 (cut/qcut)**: Binary search in `assignBins()`. `qcut` uses right=true/include_lowest=true. Integer bins: edges[0] below min. `deduplicateEdges()` for uniform data.
- **Iter 138 (to_from_dict + wide_to_long)**: PR #81 branch state verification needed. `wideToLong` anchored regex for `{stub}{sep}{suffix}`. Suffixes sorted numerically then lexicographically.
- **Iters 131–135**: `insertColumn` rebuilds ordered Map. `idxmin/idxmax` `lessThan`/`greaterThan` helpers. `castOne(v, dt)` for astype. `inferBestDtype` checks bool before int.
- **Iters 119–130**: `__MISSING__` sentinel. `pctChange`: `(x[i]-x[i-p])/|x[i-p]|`. `rollingSem/Skew/Kurt`. `sampleCov(ddof=1)`. `crossCorr(x,y,lags)`. No bun in sandbox.
- **Iters 53–118**: `Index(data,name?)`. `instanceof` dispatch pattern. GroupBy/merge/str/dt, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut, sample, apply, pipe, factorize, crosstab. `fc.double`. `RawTimestamp`.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 146)**: 39 files. Next: io/read_excel (zero-dep XLSX) · stats/string_ops_extended

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

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
- **Notes**: `strGetDummies` is the key new capability — produces one-hot DataFrame from delimited strings (mirrors pandas `str.get_dummies()`). `strExtractAll` stores matches as JSON-encoded `string[][]` to fit in Scalar type. All functions use `instanceof Series` narrowing to avoid `as` casts.

### Iteration 144 — 2026-04-09 14:39 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24196127191)
- **Status**: ✅ Accepted · **Metric**: 37 (+1) · **Commit**: `c7bf0f0`
- **Change**: `src/core/attrs.ts` — WeakMap-based metadata registry (13 fns: getAttrs, setAttrs, updateAttrs, withAttrs, copyAttrs, mergeAttrs, clearAttrs, hasAttrs, getAttr, setAttr, deleteAttr, attrsCount, attrsKeys).

### Iteration 143 — 2026-04-09 09:31 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24182985389)
- **Status**: ✅ Accepted · **Metric**: 36 (+1) · **Commit**: `10a90ae`
- **Change**: `src/window/rolling_apply.ts` — `rollingApply`, `rollingAgg`, `dataFrameRollingApply`, `dataFrameRollingAgg`.

### Iteration 142 — 2026-04-09 07:43 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24178594390)
- **Status**: ✅ Accepted · **Metric**: 35 (+1) · **Commit**: `731c81a`
- **Change**: `src/stats/notna_isna.ts` — `isna`, `notna`, `isnull`, `notnull`, `fillna`, `dropna`, `countna`, `countValid`.

### Iteration 141 — 2026-04-09 07:01 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24177038823)
- **Status**: ✅ Accepted · **Metric**: 34 (+1) · **Commit**: `8ef2d4e`
- **Change**: `src/stats/where_mask.ts` — `seriesWhere`, `seriesMask`, `dataFrameWhere`, `dataFrameMask`.

### Iteration 140 — 2026-04-09 05:17 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24173724265)
- **Status**: ✅ Accepted · **Metric**: 33 (+1) · **Commit**: `c02f7cf`
- **Change**: `src/stats/window_extended.ts` — `rollingSem`, `rollingSkew`, `rollingKurt`, `rollingQuantile`.

### Iteration 139 — 2026-04-09 04:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24172139030)
- **Status**: ✅ Accepted · **Metric**: 32 (+1) · **Commit**: `7210f1f`
- **Change**: `src/stats/cut_qcut.ts` — `cut()` and `qcut()`.

### Iters 103–140 — ✅ (metrics 25→33): insert_pop, to_from_dict/wide_to_long, cut_qcut, window_extended, assign, clip_with_bounds, pivotTableFull, infer_dtype, notna/isna, dropna, combine_first, natsort, searchsorted, valueCountsBinned, duplicated, reindex, align, explode, isin, between, unique/nunique, pct_change, replace, map/transform, read_fwf, mode, autocorr, abs/round, rolling_moments, covariance, rolling_cross_corr, cut_extended, astype, idxminmax, convert_dtypes
### Iters 53–102 — ✅ (metrics 8→24): named_agg, select_dtypes, memory_usage, Timestamp, to_numeric, json_normalize, wide_to_long, crosstab, get_dummies, factorize, datetime_tz, numeric_ops, DateOffset, date_range, where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, Foundation+GroupBy+merge+str+dt+describe+csv/json+corr+rolling+expanding+ewm+stack/unstack+melt/pivot+value_counts+MultiIndex
### Iterations 1–52 — ✅ Earlier work on diverged branches
