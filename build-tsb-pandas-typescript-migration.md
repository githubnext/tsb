# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-25T14:15:00Z |
| Iteration Count | 287 |
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
| Recent Statuses | pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted, accepted, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: pending-ci | **Issue**: #1

---

## 🎯 Current Priorities

- ✅ Core (iters 1–52), Stats (53–244), various ops (246–287)
- ✅ Through iter 287: droplevel added. 136 features on main.
- Next: more pandas API completeness (str.*, datetime ops, or additional Index methods)

---

## 📚 Lessons Learned

- **CI type errors**: `Index<Label>.size` not `.length`. `Series<Scalar>`. Use `.values` for `Index<string>` compare. Non-null `arr[i]!` for noUncheckedIndexedAccess.
- **Biome**: `useBlockStatements`. `Number.NaN`/`Number.POSITIVE_INFINITY`. Default import fc. `import type` for value-unused imports.
- **Label now includes Date**: Fix 8d2e375 added `Date` to `Label` union.
- **Biome imports**: `src/stats/*.ts` imports from `../core`, `../types.ts`, or siblings only. Tests import from `../../src/index.ts`.
- **TypeScript**: `(v as unknown) instanceof X`. `as Scalar`/`as number` for noUncheckedIndexedAccess. `df.columns.values` not `.map(String)`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`. `mi.size`.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame`.
- **Label comparison**: `(v as unknown as number) < (bound as unknown as number)` for `<`/`>`.
- **CI action_required**: Means workflow needs human approval, not test failure. Real results from push-triggered CI runs.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `str.extractall()` — wire via late-binding
- `asfreq` — convert DatetimeIndex to fixed frequency

---

## 📊 Iteration History
### Iteration 287 — 2026-04-25 14:15 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24932687823)

- **Status**: ⏳ pending-ci
- **Change**: +dropLevelSeries / dropLevelDataFrame — drop MultiIndex levels from Series/DataFrame (mirrors pandas.Series.droplevel / DataFrame.droplevel)
- **Metric**: 136 (previous best: 136, delta: 0 on main; new file adds 1 source file)
- **Commit**: 27d992a
- **Notes**: Positional, named, and negative level specifiers; axis=0/1 for DataFrame; delegates to MultiIndex.droplevel(); 25+ unit tests + 3 property tests.

### Iteration 286 — 2026-04-25 12:58 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24931293995)

- **Status**: ✅ Accepted
- **Change**: +lreshape — wide-to-long reshape with named parallel column groups (mirrors pandas.lreshape)
- **Metric**: 136 (previous best: 135, delta: +1)
- **Commit**: cc828e3

### Iters 277–285 — ⏳ pending-ci (133→136): +strCenter/strLjust/strRjust/strZfill/strWrap, +lreshape, +strGetDummies, +swapaxes, +readFwf, +unionCategoricals, +strCat, +asfreq, +atTime/betweenTime, +extractAll, +firstRows/lastRows, +monthName/dayName.
