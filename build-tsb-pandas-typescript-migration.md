# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-11T00:00:00Z |
| Iteration Count | 352 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, accepted, accepted, pending-ci, accepted, pending-ci, accepted |

---

## 🎯 Current Priorities

- `src/io/hdf.ts` — HDFStore/TSH binary I/O (HDF5-style)
- `src/core/styler.ts` — Styler class (DataFrame display styling)

---

## 📚 Lessons Learned

- **CI**: `arr[i]!` noUncheckedIndexedAccess. `import type`. `Number.NaN`. `useBlockStatements`. `for...of`.
- **Strict TS**: No `as`. `exactOptionalPropertyTypes`: guard before assign. `Index.size` not `.length`. `Index(Label[])` — filter `Scalar[]` with `(v): v is Label => v !== undefined`. `df.filter(bool[])` vs `df.select(string[])`. `Series.iat(i)` positional, `.at(label)` label.
- **Metric**: counts `src/**/*.ts` (not index) with exports. Need new files.
- **Imports**: Stats/types from `../core`/`../types.ts`. Tests from `../../src/index.ts`.
- **DataFrame**: `fromColumns({}, {index})`. `df.col(name)`. `df.columns.values` is `readonly string[]`.
- **Offsets**: onOffset→stepN; else rollforward/back then step. BusinessHour: fractional UTC.
- **HDF**: TSH magic `TSH\x01`, dtype codes 0–4. Stata DTA 118 LE; data offset=varLabelOffset+nvar*81+20.
- **Interchange**: Float `[1.5]` for float64. Float nulls→NaN (kind=1); int/str→byte mask (kind=4).
- **Errors**: Error classes shared between modules must live in `src/errors.ts` and be imported elsewhere (avoid duplicate exports across core/index and errors).

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain (counts files not exports)

---

## 🔭 Future Directions

- `src/io/hdf.ts` — HDFStore/TSH binary I/O
- `src/core/styler.ts` — Styler class

---

## 📊 Iteration History

### Iteration 352 — 2026-06-11 — [Run](https://github.com/githubnext/tsb/actions/runs/27372743227)
- **Status**: ⏳ Pending CI
- **Change**: Add `src/core/flags.ts` (DataFrameFlags), `src/io/sql.ts` (createDatabase/toSql/readSql/readSqlTable), `src/io/pickle.ts` (toPickle/readPickle TSP binary). DuplicateLabelError in errors.ts. Full tests + playground pages.
- **Metric**: Expected 154 (delta +3 vs actual branch 151, beats best 153); commit 0e849fc

### Iteration 351 — 2026-06-10 — [Run](https://github.com/githubnext/tsb/actions/runs/27301544484)
- **Status**: ⏳ Pending CI
- **Change**: Add `src/core/flags.ts` — `DataFrameFlags` class + `DuplicateLabelError` in errors.ts. Integrates `df.flags` / `ser.flags` on DataFrame and Series. Full tests + playground.
- **Metric**: Expected 152 (delta +1 vs actual branch 151); commit 57f163b

### Iteration 350 — 2026-06-09 — [Run](https://github.com/githubnext/tsb/actions/runs/27281435657)
- **Status**: ⏳ Pending CI
- **Change**: flags.ts (DataFrameFlags, DuplicateLabelError) + sql.ts (readSql, toSql, MemoryDatabase). Fixed xml.ts Scalar[]→Label[], read_table.test.ts `.length`→`.size` / `filter`→`select` / exactOptionalPropertyTypes.
- **Metric**: Expected 153 (+1 vs best 152); commits a46bda3, 68f8fae

### Iters 316–349 — ✅/⏳ (148→152): readXml, readTable, caseWhen, lreshape, interchange, readStata/toStata, clipboard, pytables, plot, sql, flags, cut_bins, pickle, formats. Multiple rebases.

### Iters 1–315 — ✅ (0→148): Full pandas core, stats, io, merge, reshape, window, groupby, datetime, offsets, period, interval, multi-index, and more.
