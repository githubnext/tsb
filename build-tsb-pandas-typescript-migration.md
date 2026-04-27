# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-27T07:55:00Z |
| Iteration Count | 292 |
| Best Metric | 136 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | pending-ci |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: pending-ci | **Issue**: #1

---

## 🎯 Current Priorities

- ✅ Core (iters 1–52), Stats (53–244), various ops (246–292)
- ✅ Through iter 292: +DataFrame.info()/seriesInfo() added. 136 features on branch.
- Next: pd.util.hash_pandas_object, DataFrame.bool(), pd.Grouper, more string ops

---

## 📚 Lessons Learned

- **CI type errors**: `Index<Label>.size`. `Series<Scalar>`. Non-null `arr[i]!` for noUncheckedIndexedAccess.
- **Biome**: `useBlockStatements`. `Number.NaN`. Default import fc. `import type` for unused imports.
- **Label includes Date**: Fix 8d2e375.
- **Imports**: `src/stats/*.ts` imports from `../core`, `../types.ts`, or siblings. Tests from `../../src/index.ts`.
- **TypeScript**: `as Scalar`/`as number` for noUncheckedIndexedAccess. `df.columns.values`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame`.
- **CI action_required**: Means human approval needed, not test failure.
- **git stash**: Does NOT stash untracked files (untracked files persist through stash).
- **to_html**: Use df.col(col).at(i) for cell values; df.index.at(i) for index labels.
- **Baseline metric**: Always check `main` baseline. Branch fast-forwarded to main when ahead=0.
- **info.ts**: Use `df.col(col) as Series<Scalar>` + `series.values as readonly Scalar[]` + `series.dtype.name`. `df.shape[0]` for nRows, `df.shape[1]` for nCols.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `pd.util.hash_pandas_object()` — hash each row/element
- `DataFrame.bool()` — evaluate DataFrame as boolean
- `pd.Grouper` class — groupby helper
- `pd.api.types` extensions — more type predicates
- More string ops, `str.extractall()` late-binding

---

## 📊 Iteration History

### Iteration 292 — 2026-04-27 07:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24982683414)

- **Status**: ⏳ pending-ci
- **Change**: +dataFrameInfo()/seriesInfo() — mirrors pandas.DataFrame.info()
- **Metric**: 136 (previous best: 135, delta: +1)
- **Commit**: 3e7c2dc
- **Notes**: New file src/stats/info.ts. Returns structured DataFrameInfoResult with text, nRows, nCols, columns (name/nonNull/dtype). Includes memoryUsage option and verbose mode.

### Iteration 291 — 2026-04-26 13:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24957618908)

- **Status**: ⏳ pending-ci
- **Change**: +to_html (dataFrameToHtml/seriesToHtml) + Flags class (dataFrameFlags/seriesFlags)
- **Metric**: 137 (previous best: 136, delta: +1)
- **Commit**: 8955089
- **Notes**: Two new files: src/stats/to_html.ts and src/core/flags.ts. Main was already at 135; branch brings it to 137. Main had merged previous pending-ci iterations, so baseline was 135.

### Iters 273–290 — pending-ci/accepted (130→136): +lreshape, +strCenter/strLjust/strRjust/strZfill/strWrap, +strGetDummies, +swapaxes, +readFwf, +unionCategoricals, +strCat, +asfreq, +atTime/betweenTime, +extractAll, +firstRows/lastRows, +monthName/dayName, +to_html, +itertuples, +dropLevel, +flags.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
