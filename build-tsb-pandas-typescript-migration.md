# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-27T01:40:00Z |
| Iteration Count | 329 |
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
| Recent Statuses | accepted, accepted, pending-ci, accepted, accepted, accepted, pending-ci, pending-ci, accepted, accepted |

## 🎯 Current Priorities

- Next: More `pd.io` features: read_feather, read_parquet

## 📚 Lessons Learned

- **CI**: `arr[i]!` for noUncheckedIndexedAccess. `import type` for unused imports. `Number.NaN` not `NaN`. `useBlockStatements` in Biome.
- **Imports**: Stats from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`.
- **Offset pattern**: `if onOffset → stepN(date, n); else if n>0 → stepN(rollforward(date), n-1); else → stepN(rollback(date), n+1)`. Keep helpers private. Each new offset file adds +1 to metric.
- **CustomBusinessDay**: Store options in constructor separately from the internal CDay instance so multiply/negate can clone without `as` casts.
- **exactOptionalPropertyTypes**: When cloning options with optional fields, use explicit `if (field !== null/undefined) opts.field = field` pattern.

## 🔭 Future Directions

- More `pd.io` features: read_feather, read_parquet
- `pd.offsets.CustomBusinessHour` — business hour offset

## 📊 Iteration History

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

