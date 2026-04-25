# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-25T12:58:00Z |
| Iteration Count | 286 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: pending-ci | **Issue**: #1

---

## 🎯 Current Priorities

Completed through iter 279:
- ✅ Core (iters 1–52): DataFrame, Series, Index, dtypes, I/O, groupby, merge, reshape, window
- ✅ Stats (iters 53–244): 185+ pandas ops ported
- ✅ join/joinAll/crossJoin, infer_objects/convertDtypes, merge_asof/ordered, resample, xs (246–254)
- ✅ toHtml/Markdown, toRecords/fromRecords, isocalendar, periodRange, options, pd.testing (256–258)
- ✅ hashPandasObject, caseWhen, fromDummies, strCat, asfreq, at_time, between_time (273–278)
- ✅ firstRows/lastRows/firstSeries/lastSeries, monthName/dayName (279)

- ✅ lreshape (280)
- ✅ strGetDummies / str.get_dummies (281)
- ✅ swapaxes / DataFrame.swapaxes / Series.swapaxes (282)
- ✅ readFwf / read_fwf — fixed-width format reader (283)
- ✅ unionCategoricals / pd.api.types.union_categoricals (284)

- ✅ strCenter/strLjust/strRjust/strZfill/strWrap — string padding/justification (285)
- ✅ lreshape — wide-to-long reshape with named parallel column groups (286)

Next:
- `swapaxes` / `DataFrame.swapaxes`, `readFwf`, `unionCategoricals` — features from pending-ci iters not yet on main branch
- More `str.*` accessor extensions or pandas datetime utilities

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
### Iteration 286 — 2026-04-25 12:58 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24931293995)

- **Status**: ✅ Accepted
- **Change**: +lreshape — wide-to-long reshape with named parallel column groups (mirrors pandas.lreshape)
- **Metric**: 136 (previous best: 135, delta: +1)
- **Commit**: cc828e3
- **Notes**: New src/stats/lreshape.ts; dropna support; 30+ unit/property tests; playground page.

### Iteration 285 — ⏳ pending-ci (136): +strCenter/strLjust/strRjust/strZfill/strWrap — string padding/justification. Commit: 175caa3.

### Iters 280–284 — ⏳ pending-ci (133→136): +lreshape, +strGetDummies, +swapaxes, +readFwf, +unionCategoricals.

### Iters 277–279 — ⏳ pending-ci (135): +strCat, +asfreq, +atTime/betweenTime, +extractAll, +firstRows/lastRows, +monthName/dayName.
