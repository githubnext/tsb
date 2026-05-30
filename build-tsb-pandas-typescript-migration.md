# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-30T13:16:00Z |
| Iteration Count | 335 |
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
| Recent Statuses | pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted, accepted |

## 🎯 Current Priorities

- Next: `pd.read_orc` / `to_orc` (ORC format)
- Then: pd.offsets extended (more offsets)

## 📚 Lessons Learned

- **CI**: `arr[i]!` for noUncheckedIndexedAccess. `import type` for unused imports. `Number.NaN` not `NaN`. `useBlockStatements` in Biome.
- **Imports**: Stats from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`.
- **Offset pattern**: `if onOffset → stepN(date, n); else if n>0 → stepN(rollforward(date), n-1); else → stepN(rollback(date), n+1)`. Keep helpers private. Each new offset file adds +1 to metric.
- **CustomBusinessDay**: Store options in constructor separately from the internal CDay instance so multiply/negate can clone without `as` casts.
- **exactOptionalPropertyTypes**: When cloning options with optional fields, use explicit `if (field !== null/undefined) opts.field = field` pattern.
- **Pickle format**: Use packed Float64Array for numeric columns (NaN = null), JSON array for string/bool/object. Magic header + LE uint32 length-prefixed sections. `Dtype.from(name)` (not `Dtype.fromName`). `DataFrame.fromColumns` takes `Scalar[]` arrays, not Series.
- **Easter**: Butcher/Anonymous Gregorian algorithm. Always check result is a Sunday. Standard pandas rollforward/rollback/apply pattern works cleanly.

## 🔭 Future Directions

- `pd.read_orc` / `to_orc` (ORC format)
- More date offsets (FY5253, FY5253Quarter, etc.)

## 📊 Iteration History

### Iteration 335 — 2026-05-30 13:16 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/26684752804)
- **Status**: ✅ Accepted (pending CI)
- **Change**: Add `src/io/pickle.ts` (readPickle/toPickle — TSB Pickle Format v1) + `src/core/easter_offset.ts` (Easter DateOffset — Gregorian computus). 50+ tests each + playground pages.
- **Metric**: 153 (prev best: 152, delta: +1) — Commit: 805b2c6

### Iteration 334 — 2026-05-29 19:40 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/26658276452)
- **Status**: ✅ Accepted (pending CI)
- **Change**: Add `src/io/parquet.ts` — `readParquet`/`toParquet` — Apache Parquet v2 binary I/O.
- **Metric**: 152 (prev best: 151, delta: +1) — Commit: 4da4a29

### Iters 1–333 — ✅ (0→151): Full pandas core, stats, io, merge, reshape, window, groupby, string ops, datetime, offsets, period, interval, multi-index, grouper, lreshape, readXml/toXml, readTable, case_when, feather, offsets_extended (pending CI), and many more.

