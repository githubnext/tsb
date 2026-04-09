# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-09T00:24:43Z |
| Iteration Count | 135 |
| Best Metric | 89 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #58 (iter135 branch: autoloop/build-tsb-pandas-typescript-migration-iter135) |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 🎯 Current Priorities

**State (iter 135)**: 89 files. Next candidates:
- `src/reshape/wide_to_long_enhanced.ts` — wide_to_long with value_name option, MultiIndex support
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/core/select_dtypes_enhanced.ts` — select_dtypes with include/exclude numpy-style aliases
- `src/core/to_from_dict.ts` — toDictOriented/fromDictOriented (to_dict/from_dict)

---

## 📚 Lessons Learned

- **Iter 135 (insert_pop)**: `insertColumn(df, loc, col, values)` rebuilds the ordered column Map by iterating `df.columns.values` and inserting the new column when `idx === loc` (handles end-of-columns via post-loop insert). Uses `df.get(col)` (returns undefined) for existence checks. `popColumn` iterates columns skipping the target, returns `{series, df}`. `reorderColumns` selects columns in the given order (can subset). `moveColumn` wraps pop+insert. All non-mutating. Key: `new DataFrame(map, df.index)` constructor works with regular Map (satisfies ReadonlyMap).
- **Iter 134 (to_dict/from_dict)**: `toDictOriented(df, orient)` dispatches via switch — "dict"/"columns": column→rowLabel→value map; "list"/"series": column→array; "split": {index,columns,data}; "tight": split + index_names/column_names; "records": row array; "index": rowLabel→column→value. `fromDictOriented(data, orient)`: "columns" validates each value is array; "index" collects colSet from all row objects in insertion order; "split"/"tight" delegate to shared `buildFromRowsAndCols(rows,cols,index?)`. `labelsToIndex` promotes 0…n-1 integer labels to RangeIndex.
- **Iter 133 (idxmin/idxmax)**: `findExtremumLabel(series, mode, skipna)` scans values comparing with `lessThan`/`greaterThan` helpers that handle number, string, boolean, Date. First occurrence wins for ties. skipna=false returns label of first missing value (null/undefined/NaN). DataFrame axis 0: per-column result indexed by column names. Axis 1: per-row result indexed by row labels with column name values.
- **Iter 132 (convert_dtypes)**: `inferBestDtype()` checks allBool→bool, allInt (whole numbers)→int64, allFloat→float64, allStr→string, else object. Bool checked before int (booleans are typeof "number"=false, safe). Idempotent by construction. `castValue()` dispatches by dtype. `dataFrameConvertDtypes` wraps per-column. Options: convertBoolean, convertInteger, convertFloating, convertString all default true.
- **Iter 131 (astype)**: `castOne(v, dt)` by dtype kind. null/undefined always preserved as null. `errors='raise'|'ignore'` — on ignore, failed casts → null. `dataFrameAstype` accepts single dtype (applies to all cols) or `Record<col, dtype>` (per-column). Raises `RangeError` for unknown columns in spec. Single dtype path uses `Dtype.from(name)` singleton.
- **Iter 130 (cut_extended)**: `cutWithBins`/`qcutWithBins` return `{result, bins}` for retbins. `cutOrdered`/`qcutOrdered` return `{result, categories, ordered:true, bins}`. `compareCategories(a,b,cats)` → neg/zero/pos; null < any. `sortByCategory`. Property: antisymmetric, non-decreasing.
- **Iter 129 (rolling_cross_corr)**: `crossCorr(x,y,{lags})` — pairs (x[i],y[i-l]). Lag fmt: `l<0→"lag_neg{|l|}"`. Symmetry: crossCorr(x,y,l)==crossCorr(y,x,-l).
- **Iter 128 (covariance)**: `pairedNums()` per window + `sampleCov(ddof=1)`. Zero var → NaN. Scale-invariant.
- **Iter 127 (rolling_moments)**: `rollingSkew` Fisher-Pearson (n≥3), `rollingKurtosis` bias-corrected (n≥4). `new Series<Scalar>({data,index,name})`.
- **Iter 126 (abs/round)**: only transform `typeof v==="number"&&!isNaN(v)`. `Number(n.toFixed(d))`. `df.columns.values as string[]` + `df.col(name)`.
- **Iter 125 (autocorr)**: Pearson of `s[lag:]` vs `s[:-lag]`. Lag 0 → 1, zero var → NaN, |lag|≥n → NaN. No bun in sandbox.
- **Iter 124 (mode)**: freq-map → maxCount → sorted. `scalarKey()` distinct prefixed keys for missing.
- **Iters 119–123**: `__MISSING__` sentinel. `resolveMapper()` coerces fn/Map/dict. `encodeKey` missing→"null/undefined/NaN". `pctChange`: `(x[i]-x[i-p])/|x[i-p]|`.
- **Iters 114–118**: `Index(data,name?)`. duplicated: `df.has(col)`. isin: `!Array.isArray&&!Set&&!Symbol.iterator`. explode: `unknown[]`.
- **Iters 101–113**: `new DataFrame(new Map(...), rowIndex)`. `_addOrReplaceColumn`. `resolveBound()`. notna: `===null||===undefined||isNaN`.
- **Iters 89–100**: `fc.double`. `_mod = a-floor(a/b)*b`. `RawTimestamp`. `tryConvert→{ok,value}`.
- **Iters 53–88**: GroupBy/merge/str/dt, describe, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut, sample, apply, pipe, factorize, get_dummies, crosstab.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 126)**: 81 files. Next: stats/cut_extended (ordered dtype + per-bin labels) · stats/wide_to_long_enhanced · io/read_excel (zero-dep XLSX)

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 135 — 2026-04-09 00:24 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24165728899)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/insert_pop.ts` — `insertColumn(df, loc, col, values)`, `popColumn(df, col)`, `reorderColumns(df, order)`, `moveColumn(df, col, newLoc)` mirroring `pandas.DataFrame.insert()` and `pandas.DataFrame.pop()`.
- **Metric**: 89 (previous best: 88 on branch, delta: +1)
- **Commit**: 6902458
- **Notes**: All four functions are non-mutating (return new DataFrames). insertColumn rebuilds the ordered column Map at position loc. popColumn returns {series, df}. 40+ unit + 3 property-based tests.

### Iteration 134 — 2026-04-07 17:24 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24094874359)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/to_from_dict.ts` — `toDictOriented(df, orient)` (8 orientations) and `fromDictOriented(data, orient)` (4 orientations), mirroring `pandas.DataFrame.to_dict()` and `pandas.DataFrame.from_dict()`.
- **Metric**: 89 (previous best: 88, delta: +1)
- **Commit**: d2a469d
- **Notes**: All 8 `toDictOriented` orientations dispatched via switch with shared row/column iteration. `fromDictOriented` orient="index" collects column set in insertion order from all row objects. Shared `buildFromRowsAndCols` helper for "split" and "tight". `labelsToIndex` promotes 0…n-1 integer keys to RangeIndex. Property tests: split/tight round-trips preserve shape and values; records round-trip preserves first-row spot-check; index orient keys match row count.

### Iteration 133 — 2026-04-07 16:49 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24093345633)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/idxminmax.ts` — `idxmin`/`idxmax` for Series and `idxminDataFrame`/`idxmaxDataFrame` for DataFrame (axis 0 and 1, configurable skipna).
- **Metric**: 88 (previous best: 87, delta: +1)
- **Commit**: a3b2f93
- **Notes**: `findExtremumLabel` handles numeric, string, boolean, Date with first-occurrence tie-breaking. DataFrame axis 0 returns Series indexed by column names; axis 1 returns Series indexed by row labels with column name values. Property tests: label in index, value ≤ all others (idxmin), value ≥ all others (idxmax), single-element series has idxmin == idxmax.

### Iteration 132 — 2026-04-07 16:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24092268181)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/convert_dtypes.ts` — `convertDtypes(series)` and `dataFrameConvertDtypes(df)` mirroring `pandas.DataFrame.convert_dtypes()`.
- **Metric**: 87 (previous best: 86, delta: +1)
- **Commit**: 2a9ff73
- **Notes**: inferBestDtype() promotes whole-number floats→int64, floats→float64, bools→bool, strings→string. Idempotent. Options: convertBoolean/convertInteger/convertFloating/convertString all default true. Property tests: idempotent, null count preserved, type-correct output.

### Iters 127–132 — ✅ (metrics 82→87): rolling_moments (82), covariance (83), rolling_cross_corr (84), cut_extended (85), astype (86), convert_dtypes (87)

### Iteration 126 — ✅ abs/round (81) · Iteration 125 — ✅ autocorr (80)

### Iteration 124 — ✅ mode (79) · Iteration 123 — ✅ read_fwf (78)

### Iteration 122 — ✅ map/transform (77) · Iteration 121 — ✅ replace (76) · Iteration 120 — ✅ pct_change (75)

### Iters 116–119 — ✅ (metrics 71→74): explode, isin, between, unique/nunique

### Iters 103–115 — ✅ (metrics 58→70): assign, clip_with_bounds, pivotTableFull, infer_dtype, notna/isna, dropna, combine_first, natsort, searchsorted, valueCountsBinned, duplicated, reindex, align
### Iters 53–102 — ✅ (metrics 8→57): named_agg, select_dtypes, memory_usage, Timestamp, to_numeric, json_normalize, wide_to_long, crosstab, get_dummies, factorize, datetime_tz, numeric_ops, DateOffset, date_range, where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, Foundation+GroupBy+merge+str+dt+describe+csv/json+corr+rolling+expanding+ewm+stack/unstack+melt/pivot+value_counts+MultiIndex
### Iterations 1–52 — ✅ Earlier work on diverged branches
