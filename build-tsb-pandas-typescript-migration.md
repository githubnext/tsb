# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-22T12:51:32Z |
| Iteration Count | 246 |
| Best Metric | 130 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #174 |
| Steering Issue | #107 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | error, error, accepted, accepted, accepted, pending-ci, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #174 | **Steering Issue**: #107 | **Experiment Log**: #3

---

## 🎯 Current Priorities

Completed iters 239–246:
- ✅ swaplevel, truncate, between, update, filter_labels, combine, notna_boolean
- ✅ rename_ops, math_ops, dot_matmul, transform_agg, map_values, at_iat
- ✅ merge_asof (iter 246), merge_ordered (iter 246)

Next:
- `stats/period_range.ts` — standalone `period_range()` wrapper
- `merge/join.ts` — DataFrame.join (label-based join on index)
- `stats/infer_objects.ts` — infer_objects / convert_dtypes helpers

---

## 📚 Lessons Learned

- **CI type errors**: `Index<Label>.size` (not `.length`). `Series<Scalar>` (not `Series<unknown>`). Spread `readonly string[]` for toEqual. Use `.values` when comparing `Index<string>` in toEqual. Non-null assertion `arr[i]!` for `noUncheckedIndexedAccess` in loop bodies.
- **Biome**: `useBlockStatements --write --unsafe`. `Number.NaN`/`Number.POSITIVE_INFINITY`. Default import fc. `import type` for value-unused imports.
- **TypeScript**: `(value as unknown) instanceof X` for instanceof. `as Scalar`/`as number` for noUncheckedIndexedAccess. `readonly T[]`. Extract helpers for ≤15 complexity. `df.columns.values` (not `.map(String)`) — `df.columns` is `Index<string>`. `(record[key] as T[]).push(v)` for pre-initialized Record dicts.
- **MultiIndex**: Does not extend `Index<Label>`. Use `mi as unknown as Index<Label>` cast when passing to Series/DataFrame constructor. `mi.at(i)` returns `readonly Label[]`. `mi.size` for length.
- **Tests**: Import from `../../src/index.ts`. `Series<Scalar>` type. `fc.float({ noNaN: true, noDefaultInfinity: true })` to avoid Infinity in multiply-by-zero tests.
- **MCP safeoutputs**: `push_to_pull_request_branch` (not create) when PR exists. Use PR #174.
- **Regex**: Global regex requires `lastIndex=0` reset before reuse. `strFindall` stores matches as JSON strings (Scalar-compatible). `strFindallExpand` uses dummy `re.exec("")` for named group detection.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame` (creates circular: `string_accessor → frame → series → string_accessor`). Use standalone stat functions for anything returning a DataFrame.
- **Label comparison**: Use `(value as unknown as number) < (bound as unknown as number)` for `<`/`>` on `Label` — TypeScript doesn't allow these operators on union types. This pattern is provably safe for number and string labels.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `core/str_accessor` — wire `.str.extractall()` via late-binding (inject DataFrame factory)
- `str.normalize()` — Unicode normalization (NFC/NFD/NFKC/NFKD) on StringAccessor
- `merge/join.ts` — DataFrame.join (label-based join, shorthand for merge on index)
- `stats/period_range.ts` — standalone `period_range()` top-level function
- `stats/infer_objects.ts` — infer_objects / convert_dtypes helpers

---

## 📊 Iteration History
### Iter 246 — 2026-04-22 12:51 UTC — ✅ Accepted — +merge_asof (asof/nearest-key merge, backward/forward/nearest, tolerance, by-groups) +merge_ordered (sorted outer merge, fill_method=ffill). Metric: 130 (+2). Commit: 268081c. [Run](https://github.com/githubnext/tsessebe/actions/runs/24779203996)

### Iter 245 — 2026-04-22 11:55 UTC — ✅ Accepted — +seriesMap (pandas Series.map: fn/dict/Map/Series mapper, na_action) +dataFrameAt/dataFrameIat (fast scalar access). Metric: 128 (+2). Commit: db85e5c. [Run](https://github.com/githubnext/tsessebe/actions/runs/24776626741)
### Iters 239–244 — ✅ (metrics 117→126): +swapLevel/truncate, +between/Update/filter, +combine/keepTrue/keepFalse, +squeeze/item/bool/firstValidIndex/autoCorr/corrWith, +rename_ops/math_ops, +dot_matmul/transform_agg.
### Iter 243 — 2026-04-22 09:52 UTC — ✅ Accepted — +rename_ops (renameSeriesIndex/DataFrame, addPrefix/Suffix, setAxis, seriesToFrame) +math_ops (absSeries/absDataFrame/roundSeries/roundDataFrame). Metric: 124 (+2). Commit: ce632a1. [Run](https://github.com/githubnext/tsessebe/actions/runs/24771121921)
### Iters 218–238 — ✅/⚠️ (metrics 51→115): +jsonNormalize, +readExcel, +nancumops, +to_timedelta, +date_range, +timedelta_range, +queryDataFrame/evalDataFrame, +strFindall+toJson, +cutBinsToFrame+xs, fix-type-errors.
### Iters 53–217 — ✅/⚠️ (metrics 8→50): selectDtypes, interpolate, factorize, pivotTable, crosstab, getDummies, Interval, cut/qcut, clip, sample, duplicated, diff_shift, where_mask, replace, astype, idxmin/idxmax, na_ops, 22+ core features.
