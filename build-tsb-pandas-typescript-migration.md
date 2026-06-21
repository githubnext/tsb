# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-21T13:43:53Z |
| Iteration Count | 370 |
| Best Metric | 160 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, accepted, pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, accepted |

---

## 🎯 Current Priorities

- More io: HDF5 (read_hdf/to_hdf) ✅ done — Arrow/Feather ✅ done, to_excel ✅ done; next: other pandas io/stats features

---

## 📚 Lessons Learned

- **TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`; `str.charAt(i)`. Error classes → `src/errors.ts`. `exactOptionalPropertyTypes`. Dtype field = `itemsize` (lowercase). `biome-ignore lint/correctness/noNodejsModules` for node:zlib.
- **Metric**: counts `src/**/*.ts` with exports. `df.col(name)`. `df.columns.values` = `readonly string[]`. Use `DataFrame.fromColumns()` pattern (no direct Series import needed).
- **Parquet**: Thrift compact: zigzag varints, delta headers, `(count<<4)|elemType` list heads. PLAIN LE. RLE def levels: 4-byte LE prefix.
- **Arrow/Feather**: FlatBuffer backward builder. Arrow IPC: `ARROW1`+8pad+schema+recordbatch+footer+i32LE+`ARROW1`. Block.metaDataLength = 8 + paddedMetaSize. FieldNode={length:i64,null_count:i64}; Buffer={offset:i64,length:i64}; Block=24 bytes. Empty validity = no nulls.
- **Stata**: DTA v118. 14×uint64 map; patch after sections.
- **HDF5 v0**: Superblock(96B)+root-group-obj-hdr(40B)+heaps+B-tree(TREE)+SNODs(SNOD,8 entries/K=4). Key/ptr interleaved in B-tree: `off+24+i*16+8`. Each SNOD entry = 40B. Dataset obj-hdr: prefix(16)+datatype+dataspace+layout msgs. Fixed-length null-padded UTF-8 for strings. BigInt literal `0xffn` — no underscore before `n` suffix.
- **pd.arrays**: `export { X } from ... + import { X } from ...` = duplicate identifier. Fix: use `import { X }` then `export { X }`. `mask.push(this._mask[i])` with noUncheckedIndexedAccess needs `=== true`. `Timedelta.parse(s)` (not `from`), `Timedelta.fromMilliseconds(ms)`. `protected` fields accessible from same-class instances.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain

---

## 📊 Iteration History

### Iteration 370 — 2026-06-21 13:43 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27905740764)
- **Status**: ⏳ pending-ci
- **Change**: Add `pd.arrays` namespace — 7 new files: `src/core/arrays/{masked_array,integer_array,floating_array,boolean_array,string_array,datetime_array,timedelta_array}.ts`. MaskedArray abstract base + 6 concrete nullable types. Kleene 3-valued logic in BooleanArray. Fix pre-existing hdf.ts BigInt separator error. Commits 79843b1+9236dc8.
- **Metric**: 160 → 167 (Δ+7)

### Iteration 369 — 2026-06-20 20:30 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27889914172)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/io/hdf.ts` — `readHdf()`/`toHdf()` HDF5 v0 Superblock I/O; pure-TS, no deps. Float64/32, Int/UInt 8–64, Bool, fixed-length UTF-8 strings. usecols, indexCol, writeIndex, custom key. Commit d2a2e9d.
- **Metric**: 159 → 160 (Δ+1)

### Iteration 368 — 2026-06-20 09:15 UTC — accepted
- **Change**: Add `src/io/feather.ts` — `readFeather()`/`toFeather()` Apache Arrow IPC (Feather v2); pure-TS FlatBuffer backward builder + reader, Schema/RecordBatch/Footer, validity bitmaps, Int64/Float64/Bool/Utf8. Commit 91f9607.
- **Metric**: 158 → 159 (Δ+1)

### Iteration 367 — 2026-06-20 08:22 UTC — accepted
- **Change**: Add `src/io/to_excel.ts` — `toExcel()` pure-TS ZIP+OOXML. 157→158.

### Iters 1–366 — ✅ (0→157): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index, sql, xml, stata, parquet, fwf, excel, feather.
