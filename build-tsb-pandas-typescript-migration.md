# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-06T01:06:56Z |
| Iteration Count | 79 |
| Best Metric | 35 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #54 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration`
**Pull Request**: #54

---

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch `autoloop/build-tsb-pandas-typescript-migration` from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Now at 35 files (iter 79). Next candidates:
- `src/core/categorical_index.ts` — CategoricalIndex
- `apply()`/`applymap()` — element-wise function application on Series/DataFrame

---

## 📚 Lessons Learned

- **Iter 79 (cut/qcut, 34→35)**: Import from `"../core/index.ts"` barrel (not sub-files) for `useImportRestrictions`. `extractName()` must return `string | null` not `string | undefined` (exactOptionalPropertyTypes). Top-level regex vars required (`useTopLevelRegex`). Shared `cutCore()` + `assignBins()` + `resolveLabels()` keep CC≤15. `cutIntervalIndex()`/`qcutIntervalIndex()` expose bins for downstream use.
- **Iter 78 (interval, 33→34)**: `IntervalIndex` standalone class (not extending `Index<Label>`). `noUncheckedIndexedAccess`: `this.left[i] as number` after bounds check. Overlap: check `right===other.left` and test both closures.
- **Iters 73–77**: fillna (3 strategies: scalar/ColumnFillMap/Series), interpolate (linear=interior only), shift/diff, compare (NaN→false), where/mask (partition property).
- **Iter 72 (value_counts, 27→28)**: `scalarKey` for stable Map keys. `df.get(name)` not `df.tryCol()`. `import type` for type-only. Biome: `as number` not `!`.
- **Iters 70–71**: `mapNumeric`/`makeClipFn`. `Number.NEGATIVE_INFINITY`/`Number.POSITIVE_INFINITY`. `cumulateNum`/`cumulateSc` + `poisoned` flag for skipna=false.
- **Iters 67–69**: CC≤15 by extracting helpers. `Array.from({length:n},(_, i)=>i)`. `cartesianProduct` backward loop.
- **Iters 63–66**: EWM online O(n). `buildCellMap`+`buildOutputCols`. `noNestedTernary`→if/else. `**` not `Math.pow`.
- **Iters 57–62**: `*SeriesLike` interfaces avoid circular imports. `getProp(obj,key)` for index-sig. `as number` not `!`. `useBlockStatements`.
- **Iters 53–56**: Barrel files for `useImportRestrictions`. `import type`. `useForOf`. Top-level regex.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**Current state (iter 79)**: 35 files — Series, DataFrame, GroupBy, concat, merge, str/dt/cat accessors, stats/describe, io/csv, io/json, stats/corr, window/rolling, window/expanding, window/ewm, reshape/melt, reshape/pivot, reshape/stack_unstack, MultiIndex, stats/rank, stats/nlargest, stats/cum_ops, stats/elem_ops, stats/value_counts, stats/where_mask, stats/compare, stats/shift_diff, stats/interpolate, stats/fillna, core/interval, stats/cut.

**Next**: CategoricalIndex · apply()/applymap()

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 79 — 2026-04-06 01:06 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24014588932)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/cut.ts` — `cut()` and `qcut()` mirroring `pandas.cut()`/`pandas.qcut()`.
- **Metric**: 35 (previous: 34, delta: +1)
- **Commit**: b93bc25
- **Notes**: Equal-width and quantile binning; custom labels, integer codes; includeLowest; duplicates="drop"; cutIntervalIndex()/qcutIntervalIndex() helpers. 30+ tests plus property-based tests.

### Iteration 78 — 2026-04-06 00:29 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24013890896)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/interval.ts` — `Interval` and `IntervalIndex` mirroring `pandas.Interval`/`pandas.IntervalIndex`.
- **Metric**: 34 (previous: 33, delta: +1)
- **Commit**: f90a171
- **Notes**: `Interval` supports 4 closure modes; `IntervalIndex` provides `fromBreaks()`, `get_loc()` for bin lookup, `contains()`, `overlaps()`, `filter()`, `rename()`, monotonicity checks. 60+ tests.

### Iteration 77 — 2026-04-05 23:45 UTC — ✅ fillna (32→33) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24013124690)
### Iteration 76 — 2026-04-05 23:11 UTC — ✅ interpolate (31→32) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24012563442)

### Iteration 75 — 2026-04-05 22:50 UTC — ✅ shift_diff (30→31) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24012145919)
### Iteration 74 — 2026-04-05 22:09 UTC — ✅ compare (29→30) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24011536762)
### Iteration 73 — 2026-04-05 21:50 UTC — ✅ where_mask (28→29) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24011120613)
### Iteration 72 — 2026-04-05 21:25 UTC — ✅ value_counts (27→28) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24010521196)
### Iteration 71 — 2026-04-05 20:46 UTC — ✅ elem_ops (26→27) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24010099827)

### Iteration 70 — 2026-04-05 20:09 UTC — ✅ cum_ops (25→26) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24009460051)
### Iteration 69 — 2026-04-05 19:44 UTC — ✅ nlargest/nsmallest (24→25) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24009034419)
### Iteration 68 — 2026-04-05 19:16 UTC — ✅ rank (23→24) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24008535770)
### Iteration 67 — 2026-04-05 18:47 UTC — ✅ MultiIndex (22→23) — [Run](https://github.com/githubnext/tsessebe/actions/runs/24008035023)
### Iters 60–66 — ✅ corr/cov(15), rolling(16), expanding×2(17–18), cat_accessor, melt+pivot(20), ewm(21), stack/unstack(22)
### Iterations 53–59 — ✅ GroupBy, merge, str, dt, describe/quantile, csv I/O, json I/O (metrics 8–14)
### Iterations 1–52 — ✅ Foundation + earlier pandas features (old branches)
