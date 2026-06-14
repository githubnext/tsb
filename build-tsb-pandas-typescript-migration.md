# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-14T13:21:15Z |
| Iteration Count | 356 |
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
| Recent Statuses | pending-ci, pending-ci, accepted, accepted, pending-ci, accepted, pending-ci, pending-ci, pending-ci, accepted |

---

## 🎯 Current Priorities

- More io: parquet (custom binary), feather format
- `src/io/stata.ts` — read_stata/to_stata (DTA format)
- `src/io/sql.ts` — SQL I/O helpers

---

## 📚 Lessons Learned

- **CI**: `arr[i]!` noUncheckedIndexedAccess. `import type`. `Number.NaN`. `useBlockStatements`. `for...of`.
- **Strict TS**: No `as`. `exactOptionalPropertyTypes`: guard before assign. `Index.size` not `.length`. `Index(Label[])` — filter `Scalar[]` with `(v): v is Label => v !== undefined`. `df.filter(bool[])` vs `df.select(string[])`. `Series.iat(i)` positional, `.at(label)` label.
- **Metric**: counts `src/**/*.ts` (not index) with exports. Need new files.
- **Imports**: Stats/types from `../core`/`../types.ts`. Tests from `../../src/index.ts`.
- **DataFrame**: `fromColumns({}, {index})`. `df.col(name)`. `df.columns.values` is `readonly string[]`.
- **Offsets**: onOffset→stepN; else rollforward/back then step. BusinessHour: fractional UTC.
- **HDF/TSH**: TSH magic `TSH\x01`, dtype codes 0=float64, 2=bool, 3=string, 4=datetime. Null bitmap: ceil(n_rows/8) bytes. String: 4-byte len + bytes, 0xFFFFFFFF=null. No `astype()` method on Series — use `Dtype.from()` + `DataFrame.fromColumns` for dtype inference.
- **Interchange**: Float `[1.5]` for float64. Float nulls→NaN (kind=1); int/str→byte mask (kind=4).
- **Errors**: Error classes shared between modules must live in `src/errors.ts` and be imported elsewhere (avoid duplicate exports across core/index and errors).
- **Flags/WeakMap**: Use structural interface `IndexLike { values: readonly unknown[] }` for FlaggedObject.index/columns to avoid `as` casts AND circular imports. `DataFrame` and `Series` structurally satisfy `FlaggedObject`. WeakMap key is `FlaggedObject` (interface type — satisfies WeakKey). Use `import type { Flags }` in frame.ts/series.ts (Flags only used as return type annotation, not as value). `getFlags(this)` returns a new wrapper each call but all share WeakMap state.
- **State pending-ci**: Many recent iterations ended in pending-ci — the state file was updated but CI gate was never confirmed, meaning the actual branch code lagged the state file metric. On iter 356, confirmed actual branch metric was 151 before adding flags.ts.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain (counts files not exports)

---

## 🔭 Future Directions

- More io: parquet (custom binary), feather format
- `src/io/stata.ts` — read_stata/to_stata (DTA format)
- `src/io/sql.ts` — SQL I/O helpers
- `src/reshape/lreshape.ts` — pd.lreshape() (wide→long reshape)

---

## 📊 Iteration History

### Iteration 356 — 2026-06-14 13:21 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27500141426)
- **Status**: ✅ Accepted
- **Change**: Add `src/core/flags.ts` — `Flags` class, WeakMap registry, `allowsDuplicateLabels`, `DuplicateLabelError` in errors.ts, `flags` getter on DataFrame + Series. Synced branch with main.
- **Metric**: 152 (previous confirmed: 151, delta: +1); commit 68aa59c

### Iters 316–355 — ✅/⏳ (148→151): readXml, readTable, caseWhen; many pending-CI iterations did not land on branch.

### Iters 1–315 — ✅ (0→148): Full pandas core, stats, io, merge, reshape, window, groupby, datetime, offsets, period, interval, multi-index, and more.
