# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-26T13:25:00Z |
| Iteration Count | 291 |
| Best Metric | 137 |
| Target Metric | — |
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

- ✅ Core (iters 1–52), Stats (53–244), various ops (246–291)
- ✅ Through iter 291: +to_html + Flags added. 137 features on branch.
- Next: pd.api.types extensions, str.extractall wiring, DataFrame.pipe improvements

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
- **Baseline metric**: Always check `main` baseline by temporarily removing the new file. git stash doesn't remove untracked files.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `pd.api.types` extensions — more type predicates
- `str.extractall()` — wire via late-binding
- `DataFrame.convert_dtypes()` — already exported, check if more refinement needed
- `DataFrame.pipe()` improvements — already exists, check completeness

---

## 📊 Iteration History

### Iteration 291 — 2026-04-26 13:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24957618908)

- **Status**: ⏳ pending-ci
- **Change**: +to_html (dataFrameToHtml/seriesToHtml) + Flags class (dataFrameFlags/seriesFlags)
- **Metric**: 137 (previous best: 136, delta: +1)
- **Commit**: 8955089
- **Notes**: Two new files: src/stats/to_html.ts and src/core/flags.ts. Main was already at 135; branch brings it to 137. Main had merged previous pending-ci iterations, so baseline was 135.

### Iteration 290 — 2026-04-25 18:29 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24937530889)

- **Status**: ⏳ pending-ci
- **Change**: +DataFrame.itertuples() + Flags class (df.flags attribute)
- **Metric**: 136 (delta: +1 new file from main baseline 135)
- **Commit**: 78189c0

### Iters 273–289 — pending-ci/accepted (130→136): +lreshape, +strCenter/strLjust/strRjust/strZfill/strWrap, +strGetDummies, +swapaxes, +readFwf, +unionCategoricals, +strCat, +asfreq, +atTime/betweenTime, +extractAll, +firstRows/lastRows, +monthName/dayName, +to_html, +itertuples, +dropLevel.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
