# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T07:30:00Z |
| Iteration Count | 10 |
| Best Metric | 11 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
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
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: (see PR created this run — #aw_pr10)
**Steering Issue**: —

---

## 🎯 Current Priorities

Merge done (metric=11). Next priorities in order:
1. **Missing data** (`src/core/missing.ts`) — isna, fillna, dropna, interpolate standalone utilities
2. **DateTime accessor** (`src/core/datetime.ts`) — Series.dt accessor: year/month/day/hour/minute/dayofweek etc.
3. **Sorting** (`src/core/sort.ts`) — sort_values, sort_index standalone functions

---

## 📚 Lessons Learned

- Iteration 1: Project structure established cleanly with Bun + Biome + strict TypeScript. The `types.ts` shared type file is the right home for `Scalar`, `Label`, `Axis`, `DtypeName`, etc.
- Iteration 3: Series<T> is best implemented as a thin wrapper around a readonly array + Index<Label> + Dtype. The `exactOptionalPropertyTypes: true` setting means you can't pass `{ name: undefined }` where `name?: string | null` is expected — use conditional spreads. For test type safety with literal-inferred Index<1|2|3>, add explicit `<number>` type parameter to avoid literal type unions that break cross-index operations. The `noUncheckedIndexedAccess` flag requires explicit `as T | undefined` casts on array accesses in sorted iterators.
- Iteration 2: Index<T> was already implemented by Copilot agent on `copilot/autoloop-build-tsb-pandas-migration`. Built on top of that work. Dtype system implemented as immutable singletons (cached with Map). `noUncheckedIndexedAccess: true` requires `as T | undefined` guards for array element access. Index<T> method signatures should accept `Label` (not T) for query/set ops to avoid TypeScript literal type inference issues.
- The `autoloop/build-tsb-pandas-typescript-migration` branch should be created from main (which has merged PRs), not from the stale autoloop branch that tracked old commit SHAs.
- Iteration 8 (aligned arithmetic): `ops.ts` provides `alignSeries`, `alignedBinaryOp`, `alignDataFrames`, `alignedDataFrameBinaryOp` as standalone utilities. No circular deps: `ops.ts` imports Series/DataFrame but they don't import back. For `_scalarOp` in `series.ts`, inline the `buildIndexMap` helper instead of importing from `ops.ts`. `Index.has()` doesn't exist — use `Index.contains()` instead. `biome check --write` auto-fixes import ordering and formatting. Use `default:` case in switch instead of last `case "right":` to satisfy `useDefaultSwitchClause`. TypeScript with `noUncheckedIndexedAccess` requires explicit guards: `map.get(key) as T | undefined`. `as unknown as number | null` cast is needed when converting Scalar values to numbers in arithmetic helpers.
- Iteration 5 (DataFrame): Column-oriented storage using `ReadonlyMap<string, Series<Scalar>>` is the right model. Biome's `useLiteralKeys` vs TypeScript's `noPropertyAccessFromIndexSignature` for `Record<string, T>` types — resolve by testing with `toEqual({...})` patterns instead of property access. Extract helper functions to satisfy `noExcessiveCognitiveComplexity` (max 15). `compareScalarPair` and `computeColumnStats` are good examples of extracted helpers. Use `biome check --write` to auto-fix formatting issues. PR creation has failed in previous iterations due to protected-file restrictions — the current branch setup from `main` should work better.
- Iteration 10 (merge): `merge()` in `src/merge/merge.ts` — build right-side key index as `Map<compositeKey, number[]>` then scan left rows. The sentinel value `-1` on leftRows signals a right-only row (for right/outer joins). Composite keys use `\x00` delimiter + `__NULL__` for nulls to avoid false collisions. `left_on`/`right_on` pairs allow different key names per side; `left_index`/`right_index` wraps the index values in a synthetic Series. Suffix disambiguation applies only to non-key columns that appear in both tables.

- Iteration 9 (Series.str): `StringAccessor` in `strings.ts` — import it in `series.ts` as a circular ESM dep that works fine (only used in method bodies). Move regex literals to module top level to satisfy `useTopLevelRegex`. Extract helpers (`replaceBounded`, `replaceAll`) to avoid `noExcessiveCognitiveComplexity`. Bug: `_selectRows` in `frame.ts` was using sliced original index labels for column Series — fix by using `new RangeIndex(positions.length)` for column Series (DataFrame.index preserves original labels, column Series get fresh 0-based index). Bug: `DataFrameGroupBy.sum/mean/std` was including non-numeric columns — fix by adding `numericOnly` param to `_valueCols()`.

---

## 🚧 Foreclosed Avenues

- *(none yet)*

---

## 🔭 Future Directions

### Phase 1 — Core Foundation (next 5 iterations)
1. ~~**Index** (`src/core/index.ts`)~~ — ✅ Done (by Copilot agent, merged into main)
2. ~~**Dtype system** (`src/core/dtype.ts`)~~ — ✅ Done (Iteration 2/3)
3. ~~**Series** (`src/core/series.ts`)~~ — ✅ Done (Iteration 3)
4. ~~**DataFrame** (`src/core/frame.ts`)~~ — ✅ Done (Iteration 5)
5. **Indexing/selection** (`src/core/indexing.ts`) — standalone .loc, .iloc, .at, .iat helpers; MultiIndex groundwork

### Phase 2 — Operations (iterations 6-15)
6. ~~**Arithmetic operations** (Series + Series, DataFrame + DataFrame, broadcasting)~~ ✅ Done (Iteration 8)
7. Comparison and boolean operations
8. ~~**String accessor** (Series.str)~~ ✅ Done (Iteration 9)
9. DateTime accessor (Series.dt)
10. Missing data handling (isna, fillna, dropna, interpolate)
11. Sorting (sort_values, sort_index)
12. ~~**Groupby**~~ ✅ Done (Iteration 6)
13. **Merging/joining** (merge, join, **concat**) — ~~concat~~ ✅ Done (Iteration 7), ~~merge~~ ✅ Done (Iteration 10)
14. Reshaping (pivot, melt, stack, unstack, crosstab)
15. Window functions (rolling, expanding, ewm)

### Phase 3 — I/O (iterations 16-20)
16. read_csv / to_csv
17. read_json / to_json
18. read_parquet (WASM-assisted)
19. read_excel
20. from_dict / from_records

### Phase 4 — Statistics & Advanced
21. Statistical methods (describe, corr, cov, quantile)
22. Categorical dtype
23. MultiIndex full support
24. Timedelta and Period types
25. Sparse arrays

---

## 📊 Iteration History

### Iteration 10 — 2026-04-04 07:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23974130597)

- **Status**: ✅ Accepted
- **Change**: Implemented `merge()` (`src/merge/merge.ts`) — database-style joins with inner/left/right/outer, `on`/`left_on`/`right_on`, index-based join, suffix disambiguation, many-to-many support.
- **Metric**: 11 (previous best: 10, delta: +1)
- **Commit**: 40058db
- **Notes**: Composite-key index approach handles multi-column keys cleanly. Sentinel `-1` on leftRows marks right-only rows. TypeScript compiles cleanly (only tsconfig deprecation warnings from tsc 6.x).

### Iteration 9 — 2026-04-04 06:49 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23973555676)

- **Status**: ✅ Accepted
- **Change**: Implemented `StringAccessor` (`src/core/strings.ts`) — 20+ vectorized string methods on `Series.str`. Fixed `_selectRows` bug (column Series now use fresh RangeIndex). Fixed `GroupBy.sum/mean/std` to aggregate numeric-only columns.
- **Metric**: 10 (previous best: 9, delta: +1)
- **Commit**: 6bd3f36
- **Notes**: Circular ESM imports (strings.ts↔series.ts) work fine when symbols are only used in method bodies. Bug fixes resolved 10 failing tests. `useTopLevelRegex` lint rule requires regex constants at module top level.

### Iteration 8 — 2026-04-04 06:24 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23973131426)

- **Status**: ✅ Accepted
- **Change**: Implemented index-aligned arithmetic — `src/core/ops.ts` with `alignSeries`, `alignedBinaryOp`, `alignDataFrames`, `alignedDataFrameBinaryOp`. Updated `Series._scalarOp` to align on index (pandas semantics). Added `DataFrame.add/sub/mul/div/floordiv/mod/pow`. 30+ unit tests + 3 property-based tests. Playground page.
- **Metric**: 9 (previous best: 8, delta: +1)
- **Commit**: 6fb9189
- **Notes**: No circular deps — ops.ts imports Series/DataFrame but they inline their own alignment helpers. Use `Index.contains()` not `.has()`. Switch default clause required.

### Iteration 7 — 2026-04-04 05:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23972580333)

- **Status**: ✅ Accepted | **Metric**: 8 (+1) | **Commit**: ee507e5
- **Change**: `concat()` — axis=0/1, outer/inner join, ignoreIndex.

### Iteration 6 — 2026-04-04 05:13 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23972003902)

- **Status**: ✅ Accepted | **Metric**: 7 (+1) | **Commit**: 57d00f3
- **Change**: `GroupBy` — DataFrameGroupBy and SeriesGroupBy: sum/mean/min/max/count/std/first/last/size, agg, transform, apply, filter.

### Iterations 1–5 (summary)
- **Iteration 5** ✅: DataFrame (metric=6, commit afe1066)
- **Iteration 4** ⚠️: Error (PR creation failed)
- **Iteration 3** ✅: Dtype + Series (metric=5, commit 36e76a5)
- **Iteration 2** ✅: Dtype + Index fixes (metric=4, commit a45d5c1)
- **Iteration 1** ✅: Project foundation (metric=1, baseline)
