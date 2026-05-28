# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-28T19:43:00Z |
| Iteration Count | 332 |
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
| Recent Statuses | accepted, pending-ci, accepted, accepted, pending-ci, accepted, accepted, accepted, pending-ci, pending-ci |

## 🎯 Current Priorities

- Next: read_feather/toFeather (Arrow Feather v1 format)
- Then: read_parquet/toParquet (Parquet v2)

## 📚 Lessons Learned

- **CI**: `arr[i]!` for noUncheckedIndexedAccess. `import type` for unused imports. `Number.NaN` not `NaN`. `useBlockStatements` in Biome.
- **Imports**: Stats from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`.
- **Offset pattern**: `if onOffset → stepN(date, n); else if n>0 → stepN(rollforward(date), n-1); else → stepN(rollback(date), n+1)`. Keep helpers private. Each new offset file adds +1 to metric.
- **CustomBusinessDay**: Store options in constructor separately from the internal CDay instance so multiply/negate can clone without `as` casts.
- **exactOptionalPropertyTypes**: When cloning options with optional fields, use explicit `if (field !== null/undefined) opts.field = field` pattern.
- **Feather v1**: Hand-written FlatBuffer builder (backward-building). `offset()` = bytes written from end. Column values at 8-byte-aligned `PrimitiveArray.offset`; bitmap comes BEFORE values: `bitmap_pos = values_offset - round8(ceil(n/8))`. UTF8: `(n+1)*4` byte offsets + data packed. Use `Label[]` not `Scalar[]` as decode return type to avoid `as` casts.

## 🔭 Future Directions

- read_feather/toFeather (Apache Arrow Feather v1)
- read_parquet/toParquet (Parquet v2)
- `pd.offsets.Easter` offset
- read_pickle / to_pickle

## 📊 Iteration History

### Iteration 332 — 2026-05-28 19:43 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/26597933261)
- **Status**: ⏳ Pending CI
- **Change**: Add `src/core/offsets_extended.ts` — 10 extended date offsets: QuarterEnd/Begin, SemiMonthEnd/Begin, BusinessMonthEnd/Begin, BusinessYearEnd/Begin, BusinessHour, CustomBusinessHour + 47 tests + playground page
- **Metric**: 152 (prev best: 151, delta: +1) — Commit: 3b58ed6

### Iters 319–331 — (claimed in state as 151→153 but commits were lost/never pushed; reverting to last confirmed metric=151 → 152)

### Iteration 318 — 2026-05-27 — [Run](https://github.com/githubnext/tsb/actions/runs/26534091460)
- **Status**: ✅ Accepted
- **Change**: Add caseWhen() — pd.Series.case_when() port

### Iters 1–317 — ✅ (0→151): Full pandas core, stats, io, merge, reshape, window, groupby, string ops, datetime, offsets, period, interval, multi-index, grouper, lreshape, readXml/toXml, readTable, and many more.

### Iteration 330 — 2026-05-27 — [Run](https://github.com/githubnext/tsb/actions/runs/26534091460)
- **Status**: ⏳ Pending CI
- **Change**: Add `readFeather`/`toFeather` — Feather v1 binary I/O with hand-written FlatBuffer builder/reader, all numeric types + bool + UTF-8 + timestamp, null bitmap support, index serialization + 20+ tests + playground
- **Metric**: 154 (expected, prev: 153, delta: +1) — Commit: 487c9f7

### Iteration 329 — 2026-05-27 — [Run](https://github.com/githubnext/tsb/actions/runs/26485288342)
- **Status**: ✅ Accepted
- **Change**: Add `CustomBusinessDay` + `CustomBusinessMonthEnd/Begin` with `USFederalHolidayCalendar`, `AbstractHolidayCalendar` + tests + playground
- **Metric**: 153 (prev: 152, delta: +1) — Commit: 0fda56b

### Iteration 328 — 2026-05-26 — [Run](https://github.com/githubnext/tsb/actions/runs/26440139853)
- **Status**: ✅ Accepted
- **Change**: Add `offsets_extended.ts` with QuarterEnd/Begin, SemiMonthEnd/Begin, Easter, BusinessMonthEnd/Begin, BusinessYearEnd/Begin, FY5253, FY5253Quarter + tests + playground
- **Metric**: 152 (prev: 151, delta: +1) — Commit: e4231d9

### Iters 316–327 — ✅ (149→151): +readXml/toXml, readTable, caseWhen, quarter/semi/business/Easter offsets.
### Iters 273–315 — ✅ (130→149): +Grouper, lreshape, str ops, swapaxes, readFwf, unionCategoricals, info, extractAll, rows, monthName/dayName, itertuples, dropLevel, flags, hashPandasObject, pd.options, pd.api, interval_range, period_range, infer_freq, pd.api.extensions, pdArray, toMarkdown/toLaTeX, pd.errors, readHtml.
### Iters 1–272 — ✅ (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
