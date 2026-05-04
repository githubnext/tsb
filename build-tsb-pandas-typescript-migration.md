# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-04T07:21:08Z |
| Iteration Count | 302 |
| Best Metric | 141 |
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
| Recent Statuses | accepted, pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci |

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
- ✅ Series.map() dict/Series/Map overloads + hashBijectArray/hashBijectInverse added (iter 302)
- Next: more `pd.api.types` predicates, `DataFrame.map()` (element-wise apply), `pd.cut()` improvements

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

### Iteration 302 — 2026-05-04 07:21 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25306204417)

- **Status**: ✅ Accepted
- **Change**: Add `Series.map()` dict/Series/Map overloads + `hashBijectArray()` + `hashBijectInverse()`
- **Metric**: 141 (previous best: 140, delta: +1)
- **Commit**: a1356c7
- **Notes**: `Series.map()` now accepts Record/Series/Map in addition to functions, mirroring pandas.Series.map(). Added `naAction:'ignore'` for NA pass-through. `hashBijectArray` provides bijective zero-based integer codes for categorical arrays; `hashBijectInverse` recovers original values. 32 new tests.

### Iteration 301 — 2026-05-03 12:32 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25279200195)

- **Status**: ✅ Accepted
- **Change**: Add `pd.api.indexers` — `BaseIndexer`, `FixedForwardWindowIndexer`, `VariableOffsetWindowIndexer`, `applyIndexer()`
- **Metric**: 140 (previous best: 139, delta: +1)
- **Commit**: 563f60f
- **Notes**: New `src/window/indexers.ts` provides custom window indexers for rolling computations. `FixedForwardWindowIndexer` enables forward-looking windows; `VariableOffsetWindowIndexer` supports per-row variable depth. 28 tests cover all classes and `applyIndexer` helper.

### Iters 273–301 — accepted/pending-ci (130→140): +Grouper, +lreshape, +str ops, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +rows, +monthName/dayName, +itertuples, +dropLevel, +flags, +to_html, +hashPandasObject, +hashArray/iteritems, +Grouper spec, +api.indexers.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
