# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-22T01:43:00Z |
| Iteration Count | 323 |
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
| Recent Statuses | accepted, accepted, accepted, accepted, pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci |

---

## 🎯 Current Priorities

- ✅ Core/Stats/IO/Merge/Reshape/Window/GroupBy done (1–295)
- ✅ pd.api.extensions (310), pdArray (311), toMarkdown/toLaTeX (312), pd.errors (313), readHtml (314), readXml/toXml (316), readTable (317), caseWhen (318)
- ✅ Quarter/business-month/year offsets (323): QuarterEnd, QuarterBegin, BusinessMonthEnd, BusinessMonthBegin, BusinessYearEnd, BusinessYearBegin
- **Note**: Iterations 319-322 commits were lost after branch rebase (ahead=6, behind=11). Best metric corrected from stale 153 to actual 152.
- Next: more missing pandas.tseries.offsets, pd.util, Series/DataFrame enhancements

---

## 📚 Lessons Learned

- **CI type errors**: `arr[i]!` for noUncheckedIndexedAccess. `as Scalar`/`as number` casts.
- **Biome**: `useBlockStatements`. `Number.NaN`. `import type` for unused. Default import fc.
- **Imports**: `src/stats/*.ts` from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`. No `new DataFrame({...})`.
- **Circular deps**: `string_accessor.ts` and `datetime_accessor.ts` cannot import `DataFrame`. Use standalone function pattern (e.g., `dtIsocalendar()` in `src/core/isocalendar.ts`) for methods returning DataFrames.

---

## 🚧 Foreclosed Avenues

*(none)*

---

## 🔭 Future Directions

- `pd.io.html` read_html(), `DataFrame.xs()` improvements
- ✅ readHtml done (314) — zero-dep HTML table parser, full options, property tests

---

## 📊 Iteration History

### Iteration 323 — 2026-05-22 01:43 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/26263087280)

- **Status**: ✅ Accepted | **Metric**: 152 (+1 from actual 151) | **Commit**: e0ea750
- **Change**: Add QuarterEnd, QuarterBegin, BusinessMonthEnd/Begin, BusinessYearEnd/Begin in `src/core/quarter_offsets.ts`
- **Notes**: best_metric corrected from stale 153→152 (iters 319-322 commits lost after branch rebase). 6 new pandas.tseries.offsets classes.

### Iters 316–322 — accepted/lost (149→152): +readXml/toXml (316), +readTable (317), +caseWhen (318), +holiday calendars/reindex_like/fromDummies/dt.isocalendar (319-322, commits lost after rebase).

### Iters 311–315 — pending-ci (145→149): +pdArray (311), +toMarkdown/toLaTeX (312), +pd.errors (313), +readHtml (314), +readXml/toXml attempt (315, superseded by 316).

### Iters 273–310 — accepted/pending-ci (130→144): +Grouper, +lreshape, +str ops, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +rows, +monthName/dayName, +itertuples, +dropLevel, +flags, +hashPandasObject, +hashArray, +pd.options, +pd.api, +interval_range, +period_range, +infer_freq, +pd.api.extensions.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
