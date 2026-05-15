# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-15T01:31:47Z |
| Iteration Count | 314 |
| Best Metric | 148 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted |

---

## 🎯 Current Priorities

- ✅ Core/Stats/IO/Merge/Reshape/Window/GroupBy done (1–295)
- ✅ pd.api.extensions (310), pdArray (311), toMarkdown/toLaTeX (312), pd.errors (313), readHtml (314)
- Next: more DataFrame methods, DataFrame.xs(), additional io utilities

---

## 📚 Lessons Learned

- **CI type errors**: `arr[i]!` for noUncheckedIndexedAccess. `as Scalar`/`as number` casts.
- **Biome**: `useBlockStatements`. `Number.NaN`. `import type` for unused. Default import fc.
- **Imports**: `src/stats/*.ts` from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`. No `new DataFrame({...})`.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame`.

---

## 🚧 Foreclosed Avenues

*(none)*

---

## 🔭 Future Directions

- `pd.io.html` read_html(), `DataFrame.xs()` improvements
- ✅ readHtml done (314) — zero-dep HTML table parser, full options, property tests

---

## 📊 Iteration History

### Iter 314 — 2026-05-15 01:31 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/25895292191)

- **Status**: pending-ci | **Metric**: 148 (+1) | **Commit**: 95deeae
- **Change**: Add `readHtml()` — pd.io.html port; zero-dep mini HTML parser returning DataFrames
- **Notes**: `src/io/read_html.ts`. Options: header, indexCol, match, naValues, converters, thousands, decimal, skipRows, nrows, skipBlankLines. Entity decoding. Nested table support. 30+ tests + property tests. Playground page.

### Iter 313 — 2026-05-14 07:51 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/25848596047)

- **Status**: pending-ci | **Metric**: 147 (+1) | **Commit**: 7ba560d
- **Change**: Add `pd.errors` module — full pandas exception/warning hierarchy (31 classes)
- **Notes**: `src/errors.ts`. ValueError/KeyError/IndexError bases + ParserError, EmptyDataError, MergeError, OutOfBoundsDatetime, IntCastingNaNError, ChainedAssignmentError, etc. `errors` namespace export. 50+ tests, playground page.

### Iter 312 — 2026-05-13 19:27 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25821429313)

- **Status**: pending-ci | **Metric**: 146 (+1) | **Commit**: 79696c3
- **Change**: Add `toMarkdown()` and `toLaTeX()` — table formatters for DataFrame/Series
- **Notes**: `src/stats/format_table.ts`. Options: alignment, index, floatFormat, booktabs, longtable, tableEnv, caption, label, LaTeX escaping. 27 tests, playground.

### Iter 311 — 2026-05-13 01:14 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25771877156)

- **Status**: pending-ci | **Metric**: 145 (+1) | **Commit**: 73915da
- **Change**: Add `pdArray()` — `pd.array()` factory with dtype inference and `PandasArray`.

### Iters 273–310 — accepted/pending-ci (130→144): +Grouper, +lreshape, +str ops, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +rows, +monthName/dayName, +itertuples, +dropLevel, +flags, +hashPandasObject, +hashArray, +pd.options, +pd.api, +interval_range, +period_range, +infer_freq, +pd.api.extensions.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
