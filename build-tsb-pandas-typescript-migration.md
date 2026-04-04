# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T05:13:31Z |
| Iteration Count | 6 |
| Best Metric | 7 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: (see PR created this run)
**Steering Issue**: —

---

## 🎯 Current Priorities

GroupBy is now done (metric=7). Next priorities in order:
1. **concat** (`src/merge/concat.ts`) — combine DataFrames/Series along an axis; prerequisite for many real-world workflows
2. **Arithmetic operations** on Series+Series and DataFrame+DataFrame with broadcasting
3. **Indexing/selection** (`src/core/indexing.ts`) — standalone .loc, .iloc, .at, .iat helpers

---

## 📚 Lessons Learned

- Iteration 1: Project structure established cleanly with Bun + Biome + strict TypeScript. The `types.ts` shared type file is the right home for `Scalar`, `Label`, `Axis`, `DtypeName`, etc.
- Iteration 3: Series<T> is best implemented as a thin wrapper around a readonly array + Index<Label> + Dtype. The `exactOptionalPropertyTypes: true` setting means you can't pass `{ name: undefined }` where `name?: string | null` is expected — use conditional spreads. For test type safety with literal-inferred Index<1|2|3>, add explicit `<number>` type parameter to avoid literal type unions that break cross-index operations. The `noUncheckedIndexedAccess` flag requires explicit `as T | undefined` casts on array accesses in sorted iterators.
- Iteration 2: Index<T> was already implemented by Copilot agent on `copilot/autoloop-build-tsb-pandas-migration`. Built on top of that work. Dtype system implemented as immutable singletons (cached with Map). `noUncheckedIndexedAccess: true` requires `as T | undefined` guards for array element access. Index<T> method signatures should accept `Label` (not T) for query/set ops to avoid TypeScript literal type inference issues.
- The `autoloop/build-tsb-pandas-typescript-migration` branch should be created from main (which has merged PRs), not from the stale autoloop branch that tracked old commit SHAs.
- Iteration 6 (GroupBy): The `useImportRestrictions` Biome rule requires importing from barrel `index.ts` files, not individual module files. This applies across module boundaries. ESM circular deps between `frame.ts` → `groupby/index.ts` → `frame.ts` work fine with class methods (the circular ref is only resolved when the method is called, not at import time). The `useBlockStatements` rule fires on single-line `if` bodies — `biome check --write --unsafe` auto-fixes most. Helper functions extracted for cognitive complexity: `checkGroupSum` in tests. The `noNonNullAssertion` rule forbids `!` — use explicit undefined check instead.
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
6. Arithmetic operations (Series + Series, DataFrame + DataFrame, broadcasting)
7. Comparison and boolean operations
8. String accessor (Series.str)
9. DateTime accessor (Series.dt)
10. Missing data handling (isna, fillna, dropna, interpolate)
11. Sorting (sort_values, sort_index)
12. ~~**Groupby**~~ ✅ Done (Iteration 6)
13. **Merging/joining** (merge, join, **concat**) ← high priority next
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

### Iteration 6 — 2026-04-04 05:13 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23972003902)

- **Status**: ✅ Accepted
- **Change**: Implemented `GroupBy` — DataFrameGroupBy and SeriesGroupBy with full split-apply-combine: sum/mean/min/max/count/std/first/last/size, agg() with named/fn/per-column specs, transform(), apply(), filter(), getGroup(), ngroups, groupKeys, groups. Multi-key groupby. Added groupby() to DataFrame and Series. 40+ unit tests + property-based tests. Playground page.
- **Metric**: 7 (previous best: 6, delta: +1)
- **Commit**: 57d00f3
- **Notes**: ESM circular deps between frame.ts and groupby work fine. Biome's useImportRestrictions enforces barrel imports. noNonNullAssertion forbids `!` — use explicit undefined guard. useBlockStatements auto-fixed with `--unsafe`.

### Iteration 5 — 2026-04-04 04:58 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23971604724)

- **Status**: ✅ Accepted
- **Change**: Implemented `DataFrame` — 2-D column-oriented labeled table with fromColumns/fromRecords/from2D constructors, shape/ndim/size/empty, col/get/has, head/tail/iloc/loc, assign/drop/select/rename, isna/notna/dropna/fillna, filter, sum/mean/min/max/std/count/describe, sortValues/sortIndex, apply(axis=0/1), items/iterrows, toRecords/toDict/toArray, resetIndex/setIndex, toString. 35+ tests. Playground page.
- **Metric**: 6 (previous best: 5, delta: +1)
- **Commit**: afe1066
- **Notes**: Previous iteration 4 (run 23970468437) implemented DataFrame but PR creation failed. This run re-implements and successfully commits the work. Branch was reset from main to pick up all prior merged work. Key lessons: extract helpers for complexity, use toEqual patterns to avoid useLiteralKeys vs noPropertyAccessFromIndexSignature conflict, `biome check --write` auto-fixes most formatting issues.

### Iteration 4 — 2026-04-04 03:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23970468437)

- **Status**: ⚠️ Error (PR creation failed — code never committed to repo)
- **Change**: Attempted DataFrame implementation — same scope as iteration 5.
- **Metric**: N/A (PR creation failed: "Failed to apply patch")
- **Notes**: The state file was updated in repo-memory claiming metric=6, but no code reached the repository. The branch tracking was also wrong (pointing to old stale autoloop branch).

### Iteration 3 — 2026-04-04 01:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23968306924)

- **Status**: ✅ Accepted
- **Change**: Dtype system (16 immutable singletons) + full `Series<T>` (1-D labeled array with all pandas operations).
- **Metric**: 5 (previous best: 4, delta: +1) | **Commit**: 36e76a5

### Iteration 2 — 2026-04-03 19:10 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23958625367)

- **Status**: ✅ Accepted
- **Change**: Dtype system singleton descriptors + fixes to Index noUncheckedIndexedAccess errors.
- **Metric**: 4 (previous best: 1, delta: +3) | **Commit**: a45d5c1

### Iteration 1 — 2026-04-03 16:54 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23954278176)

- **Status**: ✅ Accepted
- **Change**: Project foundation — package.json, tsconfig, biome, bun, CI, playground, AGENTS.md.
- **Metric**: 1 (baseline) | **Commit**: see PR
