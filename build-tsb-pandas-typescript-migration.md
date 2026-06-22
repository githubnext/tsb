# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-22T19:57:00Z |
| Iteration Count | 373 |
| Best Metric | 173 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, accepted, pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci |

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
- **IBM 370 floats**: Missing = byte0 `0x2e`/`A-Z`. `mantissa = 16^(exp-64) × mantissaInt / 2^56`. Use BigInt in encoder.
- **toOffset/inferFreq**: Multiplier prefix, week anchor, null for unknown/empty.
- **SparseArray**: COO format (Int32Array indices + Float64Array values). NaN fill uses Object.is for equality. For...of on TypedArrays gives `number` (no `| undefined`). Private constructor pattern — expose only static factories.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain

---

## 📊 Iteration History

### Iteration 373 — 2026-06-22 19:57 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27979943852)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/core/sparse.ts` — `SparseArray` + `SparseDtype`. COO sparse storage (Int32Array indices, Float64Array values). Properties: sp_values, sp_index, density, npoints. Methods: at(), toDense(), toCoo(), fillna(), withFillValue(), slice(), add(), mul(), sum(), mean(), max(), min(), std(). Static factories: fromDense(), fromSparse(). Tests + playground/sparse.html. Commit a5bcae2.
- **Metric**: 172 → 173 (Δ+1, pending CI confirmation)

### Iteration 372 — 2026-06-22 03:00 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27940628202)
- **Status**: ⏳ pending-ci
- **Change**: Add `tseries/offsets` (QuarterEnd, QuarterBegin, BMonthEnd, BMonthBegin, BYearEnd, BYearBegin), `tseries/frequencies` (toOffset, inferFreq, FREQ_ALIASES), `io/read_sas` (SAS XPORT v5: IBM 370 float conversion, namestr parsing). Tests + playground/sas.html. Commit ce77f54.
- **Metric**: 169 → 172 (Δ+3, pending CI confirmation)

### Iters 370–371 — ⏳ pending-ci
- 370: `pd.arrays` — 7 MaskedArray types (masked/int/float/bool/string/datetime/timedelta). 160→167.
- 371: `tseries/holiday` — AbstractHolidayCalendar + USFederalHolidayCalendar (11 holidays, WeekdayOffset, 6 observance fns). 167→171.

### Iters 367–369 — accepted/pending-ci
- 367: `src/io/to_excel.ts` — `toExcel()` pure-TS ZIP+OOXML. 157→158.
- 368: `src/io/feather.ts` — `readFeather()`/`toFeather()` Apache Arrow IPC. 158→159.
- 369: `src/io/hdf.ts` — `readHdf()`/`toHdf()` HDF5 v0. 159→160.

### Iters 1–366 — ✅ (0→157): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index, sql, xml, stata, parquet, fwf, excel, feather.
