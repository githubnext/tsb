# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-05T16:10:53Z |
| Iteration Count | 62 |
| Best Metric | 17 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #49 |
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
**Branch**: `autoloop/build-tsb-pandas-typescript-migration`
**Pull Request**: #49

---

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch `autoloop/build-tsb-pandas-typescript-migration` from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Now at 17 files (iter 62). Next candidates:
- `src/core/cat_accessor.ts` — Series.cat categorical accessor
- `src/reshape/pivot.ts` — DataFrame.pivot_table()

---

## 📚 Lessons Learned

- **Iter 62 (expanding, 16→17)**: `ExpandingSeriesLike` interface (mirrors `RollingSeriesLike`) avoids circular imports. `DataFrameExpanding` appended to `frame.ts`. Default `minPeriods=1` (not window size like Rolling). `count()` ignores minPeriods (matches pandas). `std(0)` returns 0 for single-element (population std). Property tests: count non-decreasing, max≥min, sum/mean manual verification.
- **Iter 61 (rolling, 15→16)**: Use `RollingSeriesLike` interface (like `StringSeriesLike`) to avoid circular imports. `DataFrameRolling` lives in `frame.ts` not `window/rolling.ts`. `_applyColAgg` takes `{ values, name }` return type and creates `Series<Scalar>` inline. `Array.from({length:n}, ():Scalar => null)` for null-init arrays.
- **Iter 60 (corr/cov, 14→15)**: `Series.at()` label-based; use `.values[i]` for positional. `Index.filter()` doesn't exist — use `.values.filter()`. Extract helper functions for CC≤15.
- **Iter 59 (readJson/toJson, 13→14)**: `noPropertyAccessFromIndexSignature` + Biome `useLiteralKeys` conflict — use `getProp(obj,key)` helper. Always add `default` to exhaustive switches.
- **Iter 58 (readCsv/toCsv, 12→13)**: Extract `parseForcedBool/Int/Float` for CC≤15. `Array.from(..., ():T=>[])` needs explicit return type. `lines[n] as string` safe after bounds check.
- **Iter 57 (describe+quantile, 11→12)**: `noNonNullAssertion`: use `as number` not `!`. `useBlockStatements`: wrap single-line `if`. All-null array gets object dtype — use explicit `dtype: Dtype.float64`.
- **Iters 53–56**: `StringSeriesLike`/`DatetimeSeriesLike` pattern for accessors. Top-level regex. Split large fns for CC≤15. Barrel files for `useImportRestrictions`. `import type` for type-only imports. `useForOf` where index not needed.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**New branch (iter 53–62)**: 17 files — Series, DataFrame, GroupBy, concat, merge, str accessor, dt accessor, stats/describe, io/csv, io/json, stats/corr, window/rolling, window/expanding.

**Next**: cat accessor · pivot_table

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 62 — 2026-04-05 16:10 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24005305086)

- **Status**: ✅ Accepted
- **Change**: Added `src/window/expanding.ts` — `Expanding` class with pandas-compatible growing-window API (mean/sum/std/var/min/max/count/median/apply). `ExpandingSeriesLike` interface avoids circular imports. `DataFrameExpanding` in `frame.ts`. 40+ tests with property tests. Playground: `playground/expanding.html`.
- **Metric**: 17 (previous: 16, delta: +1)
- **Commit**: 2a6fe1f

### Iteration 61 — 2026-04-05 15:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24004857590)

- **Status**: ✅ Accepted
- **Change**: Added `src/window/rolling.ts` — `Rolling` class with pandas-compatible sliding-window API (mean/sum/std/var/min/max/count/median/apply). `RollingSeriesLike` interface avoids circular imports. `DataFrameRolling` in `frame.ts`. 40+ tests. Playground: `playground/rolling.html`.
- **Metric**: 16 (previous: 15, delta: +1)
- **Commit**: 2874510

### Iteration 60 — 2026-04-05 15:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24004259683)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/corr.ts` — `pearsonCorr()`, `dataFrameCorr()`, `dataFrameCov()`. 34 tests. Playground: `playground/corr.html`.
- **Metric**: 15 (previous: 14, delta: +1)
- **Commit**: a44aff5

### Iteration 59 — 2026-04-05 14:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24003815679)

- **Status**: ✅ Accepted
- **Change**: Added `src/io/json.ts` — `readJson()` + `toJson()`, 5 orient formats. 31 tests. Playground: `playground/json.html`.
- **Metric**: 14 (previous: 13, delta: +1)
- **Commit**: 3a94b08

### Iteration 58 — 2026-04-05 14:14 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24003267099)

- **Status**: ✅ Accepted
- **Change**: Added `src/io/csv.ts` — `readCsv()` + `toCsv()`. 35+ tests. Playground: `playground/csv.html`.
- **Metric**: 13 (previous: 12, delta: +1)
- **Commit**: 422db12

### Iterations 53–57 — ✅ describe/quantile, dt accessor, str accessor, merge, GroupBy+setup (iters 53–57)
### Iterations 1–52 — ✅ Foundation + earlier pandas features (old branches)

