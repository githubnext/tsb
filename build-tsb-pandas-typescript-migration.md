# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-03T12:32:13Z |
| Iteration Count | 301 |
| Best Metric | 140 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #264 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: #248 | **Issue**: #1

---

## 🎯 Current Priorities

- ✅ Core + Stats + IO + Merge + Reshape + Window + GroupBy complete (iters 1–295)
- ✅ hashPandasObject added (iter 296)
- ✅ hashArray + Series.items()/iteritems() + DataFrame.itertuples() added (iter 299)
- ✅ pd.Grouper spec object added (iter 300)
- ✅ pd.api.indexers (BaseIndexer, FixedForwardWindowIndexer, VariableOffsetWindowIndexer) added (iter 301)
- Next: `pd.util.hash_biject_array()`, `Series.map()` with dict/Series mapper, more `pd.api.types` predicates

---

## 📚 Lessons Learned

- **CI type errors**: Non-null `arr[i]!` for noUncheckedIndexedAccess. `as Scalar`/`as number` casts.
- **Biome**: `useBlockStatements`. `Number.NaN`. Default import fc. `import type` for unused imports.
- **Imports**: `src/stats/*.ts` from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame`.
- **DataFrame construction**: Use `DataFrame.fromColumns({...})`. Options `{ index: [...] }` (not plain array).
- **Tests**: Avoid fast-check unless confirmed installed. No `new DataFrame({...})` — use `.fromColumns`.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- More `pd.api.types` predicates (is_float_dtype, is_integer_dtype, is_numeric_dtype, etc.)
- `pd.util.hash_biject_array()` — hash bijection for deduplicated categorical arrays
- `DataFrame.xs()` improvements (multi-level key lookup)
- `Series.map()` with dict/Series as mapper
- Full `groupby(Grouper)` integration (use Grouper.key in DataFrameGroupBy/SeriesGroupBy)

---

## 📊 Iteration History

### Iteration 301 — 2026-05-03 12:32 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25279200195)

- **Status**: ✅ Accepted
- **Change**: Add `pd.api.indexers` — `BaseIndexer`, `FixedForwardWindowIndexer`, `VariableOffsetWindowIndexer`, `applyIndexer()`
- **Metric**: 140 (previous best: 139, delta: +1)
- **Commit**: 563f60f
- **Notes**: New `src/window/indexers.ts` provides custom window indexers for rolling computations. `FixedForwardWindowIndexer` enables forward-looking windows; `VariableOffsetWindowIndexer` supports per-row variable depth. 28 tests cover all classes and `applyIndexer` helper.

### Iteration 300 — 2026-05-02 18:31 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25258809663)

- **Status**: ✅ Accepted (pending CI)
- **Change**: Add `pd.Grouper` spec object with `isGrouper()` type-guard
- **Metric**: 139 (previous best: 138, delta: +1)
- **Commit**: e3f7774
- **Notes**: Grouper mirrors pandas.Grouper — key, freq, level, sort, dropna, closed, label options. isKeyGrouper/isFreqGrouper/isLevelGrouper helpers. 21 tests pass in sandbox.

### Iters 273–300 — accepted/pending-ci (130→139): +Grouper, +lreshape, +str ops, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +rows, +monthName/dayName, +itertuples, +dropLevel, +flags, +to_html, +hashPandasObject, +hashArray/iteritems, +Grouper spec.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
