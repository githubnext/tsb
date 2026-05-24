# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-24T19:15:00Z |
| Iteration Count | 326 |
| Best Metric | 154 |
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
| Recent Statuses | accepted, accepted, pending-ci, accepted, accepted, accepted, accepted, pending-ci, pending-ci, accepted |

---

## 🎯 Current Priorities

- ✅ Core/Stats/IO/Merge/Reshape/Window/GroupBy done (1–295)
- ✅ pd.api.extensions (310), pdArray (311), toMarkdown/toLaTeX (312), pd.errors (313), readHtml (314), readXml/toXml (316), readTable (317), caseWhen (318)
- ✅ Quarter/business-month/year offsets (325): QuarterEnd, QuarterBegin, BusinessMonthEnd, BusinessMonthBegin, BusinessYearEnd, BusinessYearBegin, SemiMonthEnd, SemiMonthBegin
- ✅ Easter offset (326): Easter, easterSunday() with Meeus/Jones/Butcher algorithm; also re-implements quarter+semi-month+business offsets in cleaner files (+3 new files → metric 154)

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
- **Offset apply pattern**: Use `if onOffset → stepN(date, n); else if n>0 → stepN(rollforward(date), n-1); else → stepN(rollback(date), n+1)`. This is cleaner and correct for all anchored offsets.

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

### Iteration 326 — 2026-05-24 19:15 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/26370311078)

- **Status**: ✅ Accepted
- **Change**: Add QuarterEnd/Begin, BusinessMonthEnd/Begin, BusinessYearEnd/Begin (quarter_offsets.ts), SemiMonthEnd/Begin (semi_month_offset.ts), Easter/easterSunday (easter_offset.ts). Full tests + playground pages.
- **Metric**: 154 (previous best: 153, delta: +1)
- **Commit**: c2932f8
- **Notes**: Three new offset files (+3 to metric). Used clean snap+step apply() pattern. Logic verified in Node.js.

### Iters 324–325 — accepted (152→153): QuarterEnd/Begin, BusinessMonth/Year, SemiMonth offsets. Branch rebased after divergence.

### Iters 316–323 — accepted/lost+re-impl (149→152): +readXml/toXml (316), +readTable (317), +caseWhen (318), iters 319-322 lost in rebase; iter 323 re-impl quarter offsets (152).

### Iters 311–315 — pending-ci (145→149): +pdArray (311), +toMarkdown/toLaTeX (312), +pd.errors (313), +readHtml (314), +readXml/toXml attempt (315, superseded by 316).

### Iters 273–310 — accepted/pending-ci (130→144): +Grouper, +lreshape, +str ops, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +rows, +monthName/dayName, +itertuples, +dropLevel, +flags, +hashPandasObject, +hashArray, +pd.options, +pd.api, +interval_range, +period_range, +infer_freq, +pd.api.extensions.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
