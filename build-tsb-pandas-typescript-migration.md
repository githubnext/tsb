# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-21T17:30:00Z |
| Iteration Count | 371 |
| Best Metric | 171 |
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
| Recent Statuses | pending-ci, pending-ci, accepted, pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci |

---

## 🎯 Current Priorities

- More io/stats features; next: scipy-style stats, more io formats

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements` = error → always use `{ }`. `useSimplifiedLogicExpression` → `!a && !b` → `!(a || b)`. Fix in same commit as feature.
- **tseries/holiday**: WeekdayOffset for floating holidays. 6 observance fns. Registry. Module auto-registers USFederalHolidayCalendar at import.
- **TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`. `exactOptionalPropertyTypes`. `biome-ignore lint/correctness/noNodejsModules` for node:zlib. BigInt `0xffn` — no `_` before `n`.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). `df.col(name)`. `df.columns.values` = `readonly string[]`.
- **Parquet**: Thrift compact: zigzag varints. PLAIN LE. RLE def levels: 4-byte LE prefix.
- **Arrow/Feather**: FlatBuffer backward builder. Arrow IPC blocks: metaDataLength = 8+paddedMeta; FieldNode/Buffer i64 pairs; Block=24B.
- **pd.arrays**: `export+import` duplicate — use `import` then `export`. `mask.push(this._mask[i] === true)`. `Timedelta.fromMilliseconds(ms)`. Protected fields accessible same-class.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain

---

## 📊 Iteration History

### Iteration 371 — 2026-06-21 17:30 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27924367245)
- **Status**: ⏳ pending-ci
- **Change**: Add `pandas.tseries.holiday` — `AbstractHolidayCalendar`, `Holiday`, `USFederalHolidayCalendar` with all 11 US federal holidays. WeekdayOffset type for floating holidays (MLK Day, Presidents Day, Memorial Day, Labor Day, Columbus Day, Thanksgiving). 6 observance functions. Holiday registry. Fix Biome `useBlockStatements`+`useSimplifiedLogicExpression` errors in pd.arrays files. Commits bb36f1e+8f9d3f1.
- **Metric**: 167 → 171 (Δ+4)

### Iteration 370 — 2026-06-21 13:43 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27905740764)
- **Status**: ⏳ pending-ci
- **Change**: Add `pd.arrays` namespace — 7 new files: `src/core/arrays/{masked_array,integer_array,floating_array,boolean_array,string_array,datetime_array,timedelta_array}.ts`. MaskedArray abstract base + 6 concrete nullable types. Kleene 3-valued logic in BooleanArray. Fix pre-existing hdf.ts BigInt separator error. Commits 79843b1+9236dc8.
- **Metric**: 160 → 167 (Δ+7)

### Iters 367–369 — accepted/pending-ci
- 367: `src/io/to_excel.ts` — `toExcel()` pure-TS ZIP+OOXML. 157→158.
- 368: `src/io/feather.ts` — `readFeather()`/`toFeather()` Apache Arrow IPC. 158→159.
- 369: `src/io/hdf.ts` — `readHdf()`/`toHdf()` HDF5 v0. 159→160.

### Iters 1–366 — ✅ (0→157): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index, sql, xml, stata, parquet, fwf, excel, feather.
