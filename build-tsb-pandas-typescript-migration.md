# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-22T06:41:00Z |
| Iteration Count | 241 |
| Best Metric | 120 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #174 |
| Steering Issue | #107 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | error, accepted, error, error, error, accepted, accepted, accepted, pending-ci, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #174 | **Steering Issue**: #107 | **Experiment Log**: #3

---

## 🎯 Current Priorities

- `stats/swaplevel.ts` ✅ iter 239: swapLevelDataFrame/swapLevelSeries/reorderLevelsDataFrame/reorderLevelsSeries
- `stats/truncate.ts` ✅ iter 239: truncateDataFrame/truncateSeries
- `stats/between.ts` ✅ iter 240: seriesBetween (pandas Series.between)
- `stats/update.ts` ✅ iter 240: seriesUpdate/dataFrameUpdate (pandas DataFrame.update)
- `stats/filter_labels.ts` ✅ iter 240: filterDataFrame/filterSeries (pandas DataFrame.filter)
- `stats/combine.ts` ✅ iter 241: combineSeries/combineDataFrame (pandas Series/DataFrame.combine)
- `stats/notna_boolean.ts` ✅ iter 241: keepTrue/keepFalse/filterBy boolean-mask helpers
- Note: `stats/assign.ts` already exists as `core/assign.ts` (dataFrameAssign) — skip
- `core/str_accessor` — add `.str.extractall()` method (blocked by circular dep)
- Next: `stats/clip_series_df.ts` — more clip variants (lower/upper per-element arrays)
- Next: `stats/melt_extended.ts` — wide_to_long, melt with value_vars patterns

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
- `stats/clip_series_df.ts` — more clip variants (lower/upper per-element arrays)
- `stats/melt_extended.ts` — wide_to_long, melt with value_vars patterns
- `stats/assign.ts` — DataFrame.assign: add/modify columns fluently
- `stats/clip_series_df.ts` — more clip variants (lower/upper per-element)
- `stats/melt_extended.ts` — wide_to_long, melt with value_vars patterns

---

## 📊 Iteration History

### Iter 241 — 2026-04-22 06:41 UTC — ✅ Accepted (CI pending) — +combineSeries/combineDataFrame + keepTrue/keepFalse/filterBy. Metric: 120 (+2). Commit: c2d3aa8. [Run](https://github.com/githubnext/tsessebe/actions/runs/24764149736)
### Iter 240 — 2026-04-22 05:50 UTC — ✅ Accepted (CI pending) — +seriesBetween + seriesUpdate/dataFrameUpdate + filterDataFrame/filterSeries. Metric: 118 (+3). Commit: 633480e. [Run](https://github.com/githubnext/tsessebe/actions/runs/24762480645)
### Iter 239 — 2026-04-22 05:12 UTC — ✅ Accepted — Fix 5 TS type errors from iter 237 + +swapLevelSeries/DataFrame/reorderLevels + truncateSeries/DataFrame. Metric: 117. Commit: 9bfae87. [Run](https://github.com/githubnext/tsessebe/actions/runs/24761017221)
### Iters 218–237 — ✅/⚠️ (metrics 51→115): +jsonNormalize(51), +readExcel(50), +nancumops(58), +to_timedelta(60), +date_range(61), +timedelta_range(108), +unique/between(110), +queryDataFrame/evalDataFrame(110), +strFindall+toJson(111), +cutBinsToFrame+xs(113), fix-type-errors(115).
### Iters 53–217 — ✅/⚠️ (metrics 8→50): selectDtypes, interpolate, factorize, pivotTable, crosstab, getDummies, Interval, cut/qcut, clip, sample, duplicated, diff_shift, where_mask, replace, astype, idxmin/idxmax, na_ops, 22+ core features.
