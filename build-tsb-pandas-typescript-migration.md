# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-03T16:54:34Z |
| Iteration Count | 1 |
| Best Metric | 1 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: —
**Steering Issue**: —

---

## 🎯 Current Priorities

Foundation is established. Next priority: implement the **Index** type system, which is prerequisite for both Series and DataFrame. Start with:
1. `RangeIndex` — simplest, integer range labels
2. `Index<T>` — generic labeled index backed by an array

---

## 📚 Lessons Learned

- Iteration 1: Project structure established cleanly with Bun + Biome + strict TypeScript. The `types.ts` shared type file is the right home for `Scalar`, `Label`, `Axis`, `DtypeName`, etc.

---

## 🚧 Foreclosed Avenues

- *(none yet)*

---

## 🔭 Future Directions

### Phase 1 — Core Foundation (next 5 iterations)
1. **Index** (`src/core/index.ts`) — RangeIndex, generic Index<T>, MultiIndex
2. **Dtype system** (`src/core/dtype.ts`) — Dtype class with casting, comparison
3. **Series** (`src/core/series.ts`) — 1-D labeled array with dtype awareness
4. **DataFrame** (`src/core/frame.ts`) — 2-D labeled table, column-oriented storage
5. **Indexing/selection** (`src/core/indexing.ts`) — .loc, .iloc, .at, .iat

### Phase 2 — Operations (iterations 6-15)
6. Arithmetic operations (Series + Series, DataFrame + DataFrame, broadcasting)
7. Comparison and boolean operations
8. String accessor (Series.str)
9. DateTime accessor (Series.dt)
10. Missing data handling (isna, fillna, dropna, interpolate)
11. Sorting (sort_values, sort_index)
12. Groupby (groupby, agg, transform, apply)
13. Merging/joining (merge, join, concat)
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

### Iteration 1 — 2026-04-03 16:54 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23954278176)

- **Status**: ✅ Accepted
- **Change**: Established complete project foundation — package.json, tsconfig.json (strictest), biome.json, bunfig.toml, src/index.ts, src/types.ts, tests/index.test.ts, CI workflow, Pages deployment workflow, playground/index.html, AGENTS.md, CLAUDE.md
- **Metric**: 1 (baseline established — `src/types.ts` counts as 1 exported feature module)
- **Commit**: see PR
- **Notes**: First iteration always accepted as baseline. Foundation is solid — strict TypeScript, Biome linting, Bun test runner, CI/CD, Pages deployment all configured. Next step is the Index type system.
