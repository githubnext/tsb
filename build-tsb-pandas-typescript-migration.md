# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-24T01:30:00Z |
| Iteration Count | 325 |
| Best Metric | 153 |
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
| Recent Statuses | accepted, pending-ci, accepted, accepted, accepted, accepted, pending-ci, pending-ci, pending-ci, accepted |

---

## 🎯 Current Priorities

- ✅ Core/Stats/IO/Merge/Reshape/Window/GroupBy done (1–295)
- ✅ pd.api.extensions (310), pdArray (311), toMarkdown/toLaTeX (312), pd.errors (313), readHtml (314), readXml/toXml (316), readTable (317), caseWhen (318)
- ✅ Quarter/business-month/year offsets (325): QuarterEnd, QuarterBegin, BusinessMonthEnd, BusinessMonthBegin, BusinessYearEnd, BusinessYearBegin, SemiMonthEnd, SemiMonthBegin

---

## 📚 Lessons Learned

- **CI type errors**: `arr[i]!` for noUncheckedIndexedAccess. `as Scalar`/`as number` casts.
- **Biome**: `useBlockStatements`. `Number.NaN`. `import type` for unused. Default import fc.
- **Imports**: `src/stats/*.ts` from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`. No `new DataFrame({...})`.
- **Circular deps**: `string_accessor.ts` and `datetime_accessor.ts` cannot import `DataFrame`. Use standalone function pattern (e.g., `dtIsocalendar()` in `src/core/isocalendar.ts`) for methods returning DataFrames.
- **Index.length**: Use `.size` not `.length` for `Index<T>` objects (e.g., `df.columns.size`).
- **Offset helpers**: When creating new offset files, keep helpers private (not exported). The `DateOffset` interface is imported as a type from `./date_offset.ts`. New offset files add to the metric count (+1 per file).

---

## 🚧 Foreclosed Avenues

*(none)*

---

## 🔭 Future Directions

- `pd.io.html` read_html(), `DataFrame.xs()` improvements
- ✅ readHtml done (314) — zero-dep HTML table parser, full options, property tests
- `pd.offsets.CustomBusinessDay` — custom holiday calendars
- `pd.offsets.FY5253` / `FY5253Quarter` — fiscal year offsets
- `pd.offsets.Easter` — Easter offset
- More `pd.io` features: read_feather, read_parquet (complex)
- `pd.util.hash_pandas_object` improvements

---

## 📊 Iteration History

### Iteration 325 — 2026-05-24 01:30 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/26348562666)

- **Status**: ✅ Accepted
- **Change**: Add QuarterEnd, QuarterBegin, BusinessMonthEnd, BusinessMonthBegin, BusinessYearEnd, BusinessYearBegin (src/core/quarter_offsets.ts) and SemiMonthEnd, SemiMonthBegin (src/core/semi_month_offset.ts). Full tests + playground page.
- **Metric**: 153 (previous best: 152, delta: +1)
- **Commit**: bf8de31
- **Notes**: Two new offset files add 8 pandas offset classes. Branch rebased on main (ahead=17, behind=11 → clean rebase), then committed and pushed to PR #323.

### Iteration 324 — 2026-05-22 19:37 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/26307307429)

- **Status**: ⏳ Pending CI (commits lost in subsequent rebase) | **Metric**: 152 (re-implementation)
- **Change**: Re-implement QuarterEnd/Begin, BusinessMonthEnd/Begin, BusinessYearEnd/Begin. Fixed pre-existing CI type errors in xml.ts + read_table.test.ts.
- **Notes**: Branch rebased from main (ahead=6, behind=11 divergence resolved). CI pending; commits subsequently lost in a further rebase.

### Iters 316–323 — accepted/lost+re-impl (149→152): +readXml/toXml (316), +readTable (317), +caseWhen (318), iters 319-322 commits lost in rebase; iter 323 re-implemented quarter offsets (152).

### Iters 311–315 — pending-ci (145→149): +pdArray (311), +toMarkdown/toLaTeX (312), +pd.errors (313), +readHtml (314), +readXml/toXml attempt (315, superseded by 316).

### Iters 273–310 — accepted/pending-ci (130→144): +Grouper, +lreshape, +str ops, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +rows, +monthName/dayName, +itertuples, +dropLevel, +flags, +hashPandasObject, +hashArray, +pd.options, +pd.api, +interval_range, +period_range, +infer_freq, +pd.api.extensions.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
