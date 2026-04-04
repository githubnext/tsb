# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T06:24:42Z |
| Iteration Count | 8 |
| Best Metric | 9 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: (see PR created this run)
**Steering Issue**: —

---

## 🎯 Current Priorities

Arithmetic operations done (metric=9). Next priorities in order:
1. **Indexing/selection** (`src/core/indexing.ts`) — standalone .loc, .iloc, .at, .iat helpers; MultiIndex groundwork
2. **merge/join** (`src/merge/merge.ts`) — database-style inner/left/right/outer joins on DataFrames
3. **Missing data** (`src/core/missing.ts`) — isna, fillna, dropna, interpolate

---

## 📚 Lessons Learned

- Iteration 1: Project structure established cleanly with Bun + Biome + strict TypeScript. The `types.ts` shared type file is the right home for `Scalar`, `Label`, `Axis`, `DtypeName`, etc.
- Iteration 3: Series<T> is best implemented as a thin wrapper around a readonly array + Index<Label> + Dtype. The `exactOptionalPropertyTypes: true` setting means you can't pass `{ name: undefined }` where `name?: string | null` is expected — use conditional spreads. For test type safety with literal-inferred Index<1|2|3>, add explicit `<number>` type parameter to avoid literal type unions that break cross-index operations. The `noUncheckedIndexedAccess` flag requires explicit `as T | undefined` casts on array accesses in sorted iterators.
- Iteration 2: Index<T> was already implemented by Copilot agent on `copilot/autoloop-build-tsb-pandas-migration`. Built on top of that work. Dtype system implemented as immutable singletons (cached with Map). `noUncheckedIndexedAccess: true` requires `as T | undefined` guards for array element access. Index<T> method signatures should accept `Label` (not T) for query/set ops to avoid TypeScript literal type inference issues.
- The `autoloop/build-tsb-pandas-typescript-migration` branch should be created from main (which has merged PRs), not from the stale autoloop branch that tracked old commit SHAs.
- Iteration 8 (aligned arithmetic): `ops.ts` provides `alignSeries`, `alignedBinaryOp`, `alignDataFrames`, `alignedDataFrameBinaryOp` as standalone utilities. No circular deps: `ops.ts` imports Series/DataFrame but they don't import back. For `_scalarOp` in `series.ts`, inline the `buildIndexMap` helper instead of importing from `ops.ts`. `Index.has()` doesn't exist — use `Index.contains()` instead. `biome check --write` auto-fixes import ordering and formatting. Use `default:` case in switch instead of last `case "right":` to satisfy `useDefaultSwitchClause`. TypeScript with `noUncheckedIndexedAccess` requires explicit guards: `map.get(key) as T | undefined`. `as unknown as number | null` cast is needed when converting Scalar values to numbers in arithmetic helpers.
- Iteration 5 (DataFrame): Column-oriented storage using `ReadonlyMap<string, Series<Scalar>>` is the right model. Biome's `useLiteralKeys` vs TypeScript's `noPropertyAccessFromIndexSignature` for `Record<string, T>` types — resolve by testing with `toEqual({...})` patterns instead of property access. Extract helper functions to satisfy `noExcessiveCognitiveComplexity` (max 15). `compareScalarPair` and `computeColumnStats` are good examples of extracted helpers. Use `biome check --write` to auto-fix formatting issues. PR creation has failed in previous iterations due to protected-file restrictions — the current branch setup from `main` should work better.
- Iteration 4 (previous): DataFrame was implemented but PR creation failed silently. The state file was updated in repo-memory but no code reached the repository. Always verify commits actually reach the repo.

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
8. String accessor (Series.str)
9. DateTime accessor (Series.dt)
10. Missing data handling (isna, fillna, dropna, interpolate)
11. Sorting (sort_values, sort_index)
12. ~~**Groupby**~~ ✅ Done (Iteration 6)
13. **Merging/joining** (merge, join, **concat**) — ~~concat~~ ✅ Done (Iteration 7)
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

### Iteration 8 — 2026-04-04 06:24 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23973131426)

- **Status**: ✅ Accepted
- **Change**: Implemented index-aligned arithmetic — `src/core/ops.ts` with `alignSeries`, `alignedBinaryOp`, `alignDataFrames`, `alignedDataFrameBinaryOp`. Updated `Series._scalarOp` to align on index (pandas semantics). Added `DataFrame.add/sub/mul/div/floordiv/mod/pow`. 30+ unit tests + 3 property-based tests. Playground page.
- **Metric**: 9 (previous best: 8, delta: +1)
- **Commit**: 6fb9189
- **Notes**: No circular deps — ops.ts imports Series/DataFrame but they inline their own alignment helpers. Use `Index.contains()` not `.has()`. `biome check --write` auto-fixes import ordering. Switch default clause required.

### Iteration 7 — 2026-04-04 05:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23972580333)

- **Status**: ✅ Accepted
- **Change**: Implemented `concat()` — combine Series/DataFrames along axis=0 (row stack) or axis=1 (column stack), with outer/inner join and ignoreIndex. 25+ unit tests + 4 property-based tests.
- **Metric**: 8 (previous best: 7, delta: +1)
- **Commit**: ee507e5
- **Notes**: Named imports required for fast-check. Helper extraction key for cognitive complexity. axis=0 Series concat doesn't need join param (no alignment axis). `!(a || b)` preferred over `!a && !b` by Biome.

### Iteration 6 — 2026-04-04 05:13 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23972003902)

- **Status**: ✅ Accepted
- **Change**: Implemented `GroupBy` — DataFrameGroupBy and SeriesGroupBy with full split-apply-combine: sum/mean/min/max/count/std/first/last/size, agg() with named/fn/per-column specs, transform(), apply(), filter(), getGroup(), ngroups, groupKeys, groups. Multi-key groupby. Added groupby() to DataFrame and Series. 40+ unit tests + property-based tests. Playground page.
- **Metric**: 7 (previous best: 6, delta: +1)
- **Commit**: 57d00f3
- **Notes**: ESM circular deps work fine. `noNonNullAssertion` forbids `!` — use explicit undefined guard.

### Iteration 5 — 2026-04-04 04:58 UTC
- **Status**: ✅ Accepted | **Metric**: 6 (delta: +1) | **Commit**: afe1066
- **Change**: Implemented `DataFrame` — full 2-D column-oriented table. 35+ tests. Playground page.

### Iteration 4 — 2026-04-04 03:55 UTC
- **Status**: ⚠️ Error (PR creation failed — code never committed)

### Iteration 3 — 2026-04-04 01:25 UTC
- **Status**: ✅ Accepted | **Metric**: 5 (delta: +1) | **Commit**: 36e76a5
- **Change**: Dtype system (16 immutable singletons) + full `Series<T>`.

### Iteration 2 — 2026-04-03 19:10 UTC
- **Status**: ✅ Accepted | **Metric**: 4 (delta: +3) | **Commit**: a45d5c1
- **Change**: Dtype system + Index fixes.

### Iteration 1 — 2026-04-03 16:54 UTC
- **Status**: ✅ Accepted | **Metric**: 1 (baseline)
- **Change**: Project foundation — package.json, tsconfig, biome, bun, CI, playground, AGENTS.md.
