# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-25T13:55:00Z |
| Iteration Count | 327 |
| Best Metric | 155 |
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

- Next: FY5253/FY5253Quarter (fiscal year offsets), CustomBusinessDay, more pd.io features

## 📚 Lessons Learned

- **CI**: `arr[i]!` for noUncheckedIndexedAccess. `import type` for unused imports. `Number.NaN` not `NaN`. `useBlockStatements` in Biome.
- **Imports**: Stats from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`.
- **Offset pattern**: `if onOffset → stepN(date, n); else if n>0 → stepN(rollforward(date), n-1); else → stepN(rollback(date), n+1)`. Keep helpers private. Each new offset file adds +1 to metric.

## 🔭 Future Directions

- `pd.offsets.FY5253` / `FY5253Quarter` — fiscal year offsets
- `pd.offsets.CustomBusinessDay` — custom holiday calendars
- More `pd.io` features: read_feather, read_parquet

## 📊 Iteration History

### Iteration 327 — 2026-05-25 — [Run](https://github.com/githubnext/tsb/actions/runs/26403893017)
- **Status**: ✅ Accepted
- **Change**: Add QuarterEnd/Begin, SemiMonthEnd/Begin, Easter, BusinessMonthEnd/Begin, BusinessYearEnd/Begin (4 new files + tests + playground)
- **Metric**: 155 (prev: 154, delta: +1) — Commit: 3d84cbc

### Iters 316–326 — ✅ (149→154): +readXml/toXml, readTable, caseWhen, quarter/semi/business/Easter offsets.
### Iters 273–315 — ✅ (130→149): +Grouper, lreshape, str ops, swapaxes, readFwf, unionCategoricals, info, extractAll, rows, monthName/dayName, itertuples, dropLevel, flags, hashPandasObject, pd.options, pd.api, interval_range, period_range, infer_freq, pd.api.extensions, pdArray, toMarkdown/toLaTeX, pd.errors, readHtml.
### Iters 1–272 — ✅ (0→130): full pandas core + stats + io + merge + reshape + window + groupby.

