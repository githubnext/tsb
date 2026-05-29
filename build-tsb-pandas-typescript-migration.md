# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-29T00:00:00Z |
| Iteration Count | 333 |
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
| Recent Statuses | pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted, accepted, accepted, pending-ci |

## 🎯 Current Priorities

- Next: read_parquet/toParquet (Parquet v2)
- Then: read_pickle / to_pickle

## 📚 Lessons Learned

- **CI**: `arr[i]!` for noUncheckedIndexedAccess. `import type` for unused imports. `Number.NaN` not `NaN`. `useBlockStatements` in Biome.
- **Imports**: Stats from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`.
- **Offset pattern**: `if onOffset → stepN(date, n); else if n>0 → stepN(rollforward(date), n-1); else → stepN(rollback(date), n+1)`. Keep helpers private. Each new offset file adds +1 to metric.
- **CustomBusinessDay**: Store options in constructor separately from the internal CDay instance so multiply/negate can clone without `as` casts.
- **exactOptionalPropertyTypes**: When cloning options with optional fields, use explicit `if (field !== null/undefined) opts.field = field` pattern.
- **Feather v1**: Hand-written FlatBuffer builder (backward-building). `offset()` = bytes written from end. Column values at 8-byte-aligned `PrimitiveArray.offset`; bitmap comes BEFORE values: `bitmap_pos = values_offset - round8(ceil(n/8))`. UTF8: `(n+1)*4` byte offsets + data packed. Use `Label[]` not `Scalar[]` as decode return type to avoid `as` casts.

## 🔭 Future Directions

- read_parquet/toParquet (Parquet v2)
- `pd.offsets.Easter` offset
- read_pickle / to_pickle

## 📊 Iteration History

### Iteration 333 — 2026-05-29 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/26641131826)
- **Status**: ⏳ Pending CI
- **Change**: Add `src/io/feather.ts` — `readFeather`/`toFeather` — Apache Arrow Feather v1 binary I/O. Hand-rolled FlatBuffer encoder/decoder. Supports float64/float32/int*/uint*/bool/utf8/timestamp. Arrow validity bitmap for nulls. Index via `__index_level_0__` convention. Column filter option. 48 tests + playground.
- **Metric**: 152 (prev actual: 151, delta: +1) — Commit: 8719c4c

### Iteration 332 — 2026-05-28 19:43 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/26597933261)
- **Status**: ⏳ Pending CI
- **Change**: Add `src/core/offsets_extended.ts` — 10 extended date offsets: QuarterEnd/Begin, SemiMonthEnd/Begin, BusinessMonthEnd/Begin, BusinessYearEnd/Begin, BusinessHour, CustomBusinessHour + 47 tests + playground page
- **Metric**: 152 (prev best: 151, delta: +1) — Commit: 3b58ed6

### Iters 319–331 — (claimed in state as 151→153 but commits were lost/never pushed; reverting to last confirmed metric=151 → 152)

### Iteration 318 — 2026-05-27 — [Run](https://github.com/githubnext/tsb/actions/runs/26534091460)
- **Status**: ✅ Accepted
- **Change**: Add caseWhen() — pd.Series.case_when() port

### Iters 1–317 — ✅ (0→151): Full pandas core, stats, io, merge, reshape, window, groupby, string ops, datetime, offsets, period, interval, multi-index, grouper, lreshape, readXml/toXml, readTable, and many more.

### Iters 318–332 — (118-series commits; net metric: 151→152 confirmed at iter 333 start; several pending-ci or lost).
