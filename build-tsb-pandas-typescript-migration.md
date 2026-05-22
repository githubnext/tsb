# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-22T19:37:20Z |
| Iteration Count | 324 |
| Best Metric | 152 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #323 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, accepted, accepted, accepted, accepted, pending-ci, pending-ci, pending-ci, pending-ci, accepted |

---

## 🎯 Current Priorities

- ✅ Core/Stats/IO/Merge/Reshape/Window/GroupBy done (1–295)
- ✅ pd.api.extensions (310), pdArray (311), toMarkdown/toLaTeX (312), pd.errors (313), readHtml (314), readXml/toXml (316), readTable (317), caseWhen (318)
- ✅ Quarter/business-month/year offsets (323): QuarterEnd, QuarterBegin, BusinessMonthEnd, BusinessMonthBegin, BusinessYearEnd, BusinessYearBegin
- ✅ Quarter/business-month/year offsets re-impl (324): same feature re-implemented after branch rebase lost iter 323 commits. Also fixed pre-existing type errors in xml.ts and read_table.test.ts. CI pending.
- **Note**: Iterations 319-322 commits were lost after branch rebase. Best metric corrected to 152 (from stale 153).

---

## 📚 Lessons Learned

- **CI type errors**: `arr[i]!` for noUncheckedIndexedAccess. `as Scalar`/`as number` casts.
- **Biome**: `useBlockStatements`. `Number.NaN`. `import type` for unused. Default import fc.
- **Imports**: `src/stats/*.ts` from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`. No `new DataFrame({...})`.
- **Circular deps**: `string_accessor.ts` and `datetime_accessor.ts` cannot import `DataFrame`. Use standalone function pattern (e.g., `dtIsocalendar()` in `src/core/isocalendar.ts`) for methods returning DataFrames.
- **Index.length**: Use `.size` not `.length` for `Index<T>` objects (e.g., `df.columns.size`).

---

## 🚧 Foreclosed Avenues

*(none)*

---

## 🔭 Future Directions

- `pd.io.html` read_html(), `DataFrame.xs()` improvements
- ✅ readHtml done (314) — zero-dep HTML table parser, full options, property tests

---

## 📊 Iteration History

### Iteration 324 — 2026-05-22 19:37 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/26307307429)

- **Status**: ⏳ Pending CI | **Metric**: 152 (same, re-implementation) | **Commit**: c250dc5
- **Change**: Re-implement QuarterEnd/Begin, BusinessMonthEnd/Begin, BusinessYearEnd/Begin (commits lost after branch rebase). Fixed pre-existing CI type errors in xml.ts + read_table.test.ts.
- **Notes**: Branch rebased from main (ahead=6, behind=11 divergence resolved). Two fix commits pushed to PR #323. CI pending.

### Iters 316–323 — accepted/lost+re-impl (149→152): +readXml/toXml (316), +readTable (317), +caseWhen (318), iters 319-322 commits lost in rebase; iter 323 re-implemented quarter offsets (152).

### Iters 311–315 — pending-ci (145→149): +pdArray (311), +toMarkdown/toLaTeX (312), +pd.errors (313), +readHtml (314), +readXml/toXml attempt (315, superseded by 316).

### Iters 273–310 — accepted/pending-ci (130→144): +Grouper, +lreshape, +str ops, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +rows, +monthName/dayName, +itertuples, +dropLevel, +flags, +hashPandasObject, +hashArray, +pd.options, +pd.api, +interval_range, +period_range, +infer_freq, +pd.api.extensions.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
