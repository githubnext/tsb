# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-18T19:38:00Z |
| Iteration Count | 364 |
| Best Metric | 156 |
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
| Recent Statuses | pending-ci, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted, pending-ci, pending-ci, pending-ci |

---

## 🎯 Current Priorities

- More io: HDF5 (read_hdf/to_hdf), to_excel (write XLSX), read_fwf ✅ done

---

## 📚 Lessons Learned

- **CI/TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`; `str.charAt(i)` not `str[i]`. `import type`. Error classes → `src/errors.ts`. `exactOptionalPropertyTypes`. `Index.size`. `Series.iat(i)`.
- **Metric**: counts `src/**/*.ts` (not index) with exports. `df.col(name)`. `df.columns.values` = `readonly string[]`.
- **IO**: SQL adapter pattern. Binary I/O: `BinReader`/`BinWriter`; patch map offsets post-write. `Label[]` ⊂ `Scalar[]`.
- **Parquet**: Thrift compact: zigzag varints, delta field headers, `(count<<4)|elemType` list heads. PLAIN LE. RLE def levels: 4-byte LE prefix. FLOAT(4) vs DOUBLE(5).
- **Arrow/Feather**: FlatBuffer backward builder. Arrow IPC: `ARROW1`+2pad+schema+recordbatch+footer+i32LE+`ARROW1`. Empty validity=no nulls.
- **Stata**: DTA v118 XML-tagged. 14×uint64 map; patch after all sections. Missing sentinels by type.
- **FWF**: `readFwf` — column inference: position is separator if `charAt` returns `""` or `" "` in ALL sample rows.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain

---

## 🔭 Future Directions

- `to_excel` (write XLSX) — complement existing readExcel
- `src/stats/` module expansions

---

## 📊 Iteration History

### Iteration 364 — 2026-06-18 19:38 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27784523734)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/io/read_fwf.ts` — `readFwf()` mirroring `pandas.read_fwf()`; whitespace-gap auto-inference; colspecs/widths; header/names/indexCol/skipRows/nRows/naValues/comment. Playground fwf.html.
- **Metric**: 156 → 157 (Δ+1); commit e198ae9

### Iters 316–363 — ✅/⏳ (148→156): feather, parquet, stata, xml, readTable, caseWhen, flags, sql, lreshape.

### Iters 1–315 — ✅ (0→148): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index.


