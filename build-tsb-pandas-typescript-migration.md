# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-29T23:35:48Z |
| Iteration Count | 296 |
| Best Metric | 137 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | pending-ci |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: pending-ci | **Issue**: #1

---

## 🎯 Current Priorities

- ✅ Core + Stats + IO + Merge + Reshape + Window + GroupBy complete (iters 1–295)
- ✅ hashPandasObject added (iter 296)
- Next: `pd.Grouper`, `DataFrame.items()`/`Series.items()`, `pd.util.hash_array()`, more `pd.api.types` predicates

---

## 📚 Lessons Learned

- **CI type errors**: `Index<Label>.size`. `Series<Scalar>`. Non-null `arr[i]!` for noUncheckedIndexedAccess.
- **Biome**: `useBlockStatements`. `Number.NaN`. Default import fc. `import type` for unused imports.
- **Imports**: `src/stats/*.ts` from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **TypeScript**: `as Scalar`/`as number` for noUncheckedIndexedAccess. `df.columns.values`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame`.
- **CI action_required**: Human approval needed, not test failure.
- **to_html**: Use df.col(col).at(i) for cell values; df.index.at(i) for index labels.
- **Baseline metric**: Always check `main` baseline. Branch fast-forwarded when ahead=0.
- **DataFrame construction in tests**: Use `DataFrame.fromColumns({...})` not `new DataFrame({...})`. Use default `fc` import, not `* as fc`.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `pd.Grouper` — spec object for groupby/resample
- `pd.util.hash_array()` — hash an arbitrary array of values
- `DataFrame.items()` / `Series.items()` — iterate as (label, value) pairs
- More `pd.api.types` predicates

---

## 📊 Iteration History

### Iteration 296 — 2026-04-29 23:35 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25139337654)

- **Status**: ⏳ pending-ci
- **Change**: +hashPandasObject — FNV-1a 64-bit hashing for Series/DataFrame
- **Metric**: 137 (previous best: 136 on main, delta: +1)
- **Commit**: 2838571
- **Notes**: src/stats/hash_pandas_object.ts. hashPandasObject(s/df, {index?}). FNV-1a 64-bit per element (Series) or row (DataFrame). Exported from stats/index.ts + src/index.ts.

### Iteration 295 — 2026-04-29 15:21 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25117554579)

- **Status**: ⏳ pending-ci
- **Change**: +Grouper — pd.Grouper spec object for groupby/resample
- **Metric**: 137 (previous best: 136 on main, delta: +1)
- **Commit**: 1e210b0
- **Notes**: src/groupby/grouper.ts. Grouper(key, level, freq, sort, closed, label, base). parseFreq + binFloor helpers. binDate() for constant-ms freqs.

### Iters 285–294 — pending-ci/accepted (133→136): +info, +extractAll, +firstRows/lastRows, +monthName/dayName, +itertuples, +dropLevel, +flags, +to_html, +hashPandasObject(prev attempt).

### Iters 273–284 — pending-ci/accepted (130→133): +lreshape, +strCenter/Ljust/Rjust/Zfill/Wrap, +strGetDummies, +swapaxes, +readFwf, +unionCategoricals.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
