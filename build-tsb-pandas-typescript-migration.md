# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-20T09:15:00Z |
| Iteration Count | 368 |
| Best Metric | 159 |
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
| Recent Statuses | pending-ci, accepted, pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted |

---

## 🎯 Current Priorities

- More io: HDF5 (read_hdf/to_hdf) — next target; Arrow/Feather ✅ done, to_excel ✅ done

---

## 📚 Lessons Learned

- **TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`; `str.charAt(i)`. Error classes → `src/errors.ts`. `exactOptionalPropertyTypes`. Dtype field = `itemsize` (lowercase). `biome-ignore lint/correctness/noNodejsModules` for node:zlib.
- **Metric**: counts `src/**/*.ts` with exports. `df.col(name)`. `df.columns.values` = `readonly string[]`. Use `DataFrame.fromColumns()` pattern (no direct Series import needed).
- **Parquet**: Thrift compact: zigzag varints, delta headers, `(count<<4)|elemType` list heads. PLAIN LE. RLE def levels: 4-byte LE prefix.
- **Arrow/Feather**: FlatBuffer backward builder. Arrow IPC: `ARROW1`+8pad+schema+recordbatch+footer+i32LE+`ARROW1`. Block.metaDataLength = 8 + paddedMetaSize. FieldNode={length:i64,null_count:i64}; Buffer={offset:i64,length:i64}; Block=24 bytes. Empty validity = no nulls.
- **Stata**: DTA v118. 14×uint64 map; patch after sections.
- **XLSX/ZIP**: CRC32 pure-TS; `deflateRawSync` node:zlib. OOXML=7 XML parts. SST for strings. `?? 0` on all array reads.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain

---

## 📊 Iteration History

### Iteration 368 — 2026-06-20 09:15 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27881185025)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/io/feather.ts` — `readFeather()`/`toFeather()` Apache Arrow IPC (Feather v2); pure-TS FlatBuffer backward builder + reader, Schema/RecordBatch/Footer, validity bitmaps, Int64/Float64/Bool/Utf8. Commit 91f9607.
- **Metric**: 158 → 159 (Δ+1)

### Iteration 367 — 2026-06-20 08:22 UTC — accepted
- **Change**: Add `src/io/to_excel.ts` — `toExcel()` pure-TS ZIP+OOXML. 157→158.

### Iters 1–366 — ✅ (0→157): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index, sql, xml, stata, parquet, fwf, excel, feather.
