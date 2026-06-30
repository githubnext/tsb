# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-29T20:30:00Z |
| Iteration Count | 388 |
| Best Metric | 186 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #363 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, pending-ci, accepted, accepted, accepted, pending-ci, accepted, accepted |

---

## 🎯 Current Priorities

- More io/stats features; next: read_avro, or advanced numeric (ACF/PACF, signal deconvolution, wavelet transforms)

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements`=error (always `{}`). `useSimplifiedLogicExpression`. `useNumberNamespace` (use `Number.X`). Fix in same commit.
- **TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`. `exactOptionalPropertyTypes`. `biome-ignore lint/correctness/noNodejsModules` for node:zlib. BigInt: no `_` before `n`.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). One new file = +1 metric.
- **Stats math**: erf (A&S 7.1.26), logGamma, regIncGamma reusable. Acklam probit; BCa = jackknife+bias-correction. Rest param `...samples: readonly (readonly number[])[]` avoids `as` casts.
- **Binary**: Parquet (Thrift compact, zigzag, RLE). Arrow/Feather (FlatBuffer). IBM 370 floats (BigInt). SAS7BDAT.
- **PCA/Mahalanobis**: Jacobi eigendecomposition for symmetric covariance matrices. Closures in `PCAResult` (transform/inverseTransform) capture frozen state — clean fitted-model pattern.
- **KDE**: Log-sum-exp in logPdf for numerical stability. Box-Muller transform + weighted CDF binary search for resample.
- **FFT/signal**: `typeof v === "object"` narrows `number | Complex`. Cooley-Tukey radix-2 DIT; non-power-of-2 → pad to nextPow2. `fftshift` half=⌊(n+1)/2⌋, `ifftshift` half=⌊n/2⌋. `noExcessiveCognitiveComplexity` → biome-ignore on nested loops. `Zxx[f]![t] = val` pattern.
- **Filters**: Butterworth → bilinear transform → SOS. `filtfilt`: reverse+sosfilt+reverse. Avoid dead-code duplicates (Biome `noUnreachable`).
- **ORC format**: Standard protobuf (LSB-first varints) for all metadata. Hadoop VInt (MSB-first big-endian) for RLE integer data streams. Single-byte range [-112,127] maps directly. Multi-byte: positive=0x88-0x8F header, negative=0x80-0x87 header + XOR(-1). PRESENT stream: RLE byte v1, MSB-first bits per row. BOOLEAN: same. INT/LONG: RLE int v1 with delta runs. `scalarToLabel()` helper avoids `as` casts when converting Scalar→Label.

---

- Adding offset/frequency classes to existing files: no metric gain (already exported)

---

## 📊 Iteration History

### Iteration 388 — 2026-06-29 20:30 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28429568433)
- **Status**: ✅ Accepted (pending CI)
- **Change**: Add `src/io/orc.ts` — Apache ORC file format reader/writer (~1200 lines). Protobuf decoder/encoder, Hadoop VInt, RLE byte/int v1, column encoders for BOOLEAN/INT/LONG/FLOAT/DOUBLE/STRING with full null (PRESENT stream) support.
- **Metric**: 185 → 186 (Δ+1)
- **Notes**: `scalarToLabel()` helper avoids `as` cast for Scalar→Label. State reset to origin/autoloop (not rebased) to allow normal push.

### Iteration 387 — 2026-06-29 19:46 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28396990118)
- **Status**: ✅ Accepted (pending CI)
- **Change**: Add `src/stats/signal.ts` (FFT/STFT/Welch) + `src/stats/filters.ts` (FIR/Butterworth). Both: tests + playground pages + index exports.
- **Metric**: 183 → 185 (Δ+2); fresh branch from main (old PR #323 was merged+branch deleted)
- **Notes**: iter 386 committed signal.ts to old branch AFTER #323 merged — never landed in main. This iteration re-implements signal.ts from scratch AND adds filters.ts to recoup +2.

### Iter 383–386 — 2026-06-28–29
- 383 ✅ information.ts (179→180); 384 ⚠️ push fail; 385 ✅ signal.ts claim (183→184); 386 ✅ signal.ts re-impl (183→184) — but landed AFTER PR #323 merged, lost.

### Iters 367–382 — ✅ (157→183): kde, bootstrap, information, multivariate, contingency, regression, hypothesis_tests, sparse, to_excel, feather, hdf, pd.arrays, holiday calendars, offsets/frequencies, read_sas, signal (×3 attempts).

### Iters 1–366 — ✅ (0→157): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index, sql, xml, stata, parquet, fwf, excel, and more.

