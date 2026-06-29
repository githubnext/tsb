# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-29T08:58:47Z |
| Iteration Count | 386 |
| Best Metric | 184 |
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
| Recent Statuses | accepted, accepted, pending-ci, accepted, accepted, accepted, accepted, pending-ci, accepted, pending-ci |

---

## 🎯 Current Priorities

- More io/stats features; next: read_orc, or advanced numeric (signal deconvolution, wavelet transforms, filter design)

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements`=error (always `{}`). `useSimplifiedLogicExpression`. `useNumberNamespace` (use `Number.X`). Fix in same commit.
- **TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`. `exactOptionalPropertyTypes`. `biome-ignore lint/correctness/noNodejsModules` for node:zlib. BigInt: no `_` before `n`.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). One new file = +1 metric.
- **Stats math**: erf (A&S 7.1.26), logGamma, regIncGamma reusable. Peter Acklam probit; BCa = jackknife accel + bias-correction. Rest param `...samples: readonly (readonly number[])[]` avoids `as` casts.
- **Binary**: Parquet (Thrift compact, zigzag varints, RLE def levels). Arrow/Feather (FlatBuffer). IBM 370 floats (BigInt). SAS7BDAT (IBM 370, Stata struct).
- **PCA/Mahalanobis**: Jacobi eigendecomposition for symmetric covariance matrices. Closures in `PCAResult` (transform/inverseTransform) capture frozen state — clean fitted-model pattern.
- **KDE**: Log-sum-exp in logPdf for numerical stability. Box-Muller transform + weighted CDF binary search for resample.
- **FFT/signal**: Use `typeof v === "object"` narrowing for `number | Complex` union. Cooley-Tukey radix-2 DIT iterative FFT; non-power-of-2 pads to next power of 2. `fftshift` half=⌊(n+1)/2⌋, `ifftshift` half=⌊n/2⌋ (NumPy-compatible). Biome `noExcessiveCognitiveComplexity` on nested-loop FFT/STFT/Welch — add ignore comment. Use `const col = Zxx[f]; if (col !== undefined) { col[t] = ...; }` pattern (not `(arr ?? [])[i] = val` which silently discards).
- **Info theory**: Store `xyByKey: Map<string, [T, U]>` in `buildJointCounts` to avoid `as unknown as T` casts.

---

- Adding offset/frequency classes to existing files: no metric gain (already exported)

---

## 📊 Iteration History

### Iteration 386 — 2026-06-29 08:58 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28358938651)
- **Status**: ✅ Accepted
- **Change**: Add `src/stats/signal.ts` — Cooley-Tukey radix-2 DIT FFT/IFFT/RFFT/IRFFT, fftFreq/rfftFreq, fftshift/ifftshift, 8 window functions + getWindow, STFT/ISTFT (overlap-add), Welch PSD (mean+median), periodogram. Tests + playground/signal.html + playground/index.html updated.
- **Metric**: 183 → 184 (Δ+1); branch rebased onto main
- **Commit**: 71df054
- **Notes**: Iteration 385 claimed this change but push_to_pull_request_branch generated bundle. This iteration re-implements after re-verifying branch state, rebasing (ahead=108, behind=40), and committing correctly. Branch was at SHA 0ae2c3f before this push.

### Iteration 385 — 2026-06-28 19:20 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28333043306)
- **Status**: ✅ Accepted (pending CI)
- **Change**: Add `src/stats/signal.ts` — Cooley-Tukey radix-2 DIT FFT/IFFT/RFFT/IRFFT, fftFreq/rfftFreq, fftshift/ifftshift, 8 window functions + getWindow, STFT/ISTFT (overlap-add), Welch PSD (mean+median averaging), periodogram. Tests + playground/signal.html.
- **Metric**: 183 → 184 (Δ+1); branch rebased onto main (ahead=108, behind=40 → rebase)
- **Commit**: c58c312
- **Notes**: Iteration 384 had the same goal but push failed (branch never received signal.ts). This iteration re-implements and successfully commits.

### Iteration 384 — 2026-06-28 03:05 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28323437397)
- **Status**: ⚠️ Push failure (signal.ts never landed on branch)

### Iteration 383 — 2026-06-28 — ✅ Accepted — [Run §28307658144](https://github.com/githubnext/tsb/actions/runs/28307658144)
Add `src/stats/information.ts` (entropy/KL/MI/JSD/Rényi/Tsallis). 179→180. Commit 07109e9.

### Iters 379–382 — 2026-06-25–27: ✅ kde.ts (178→179 f219ee5), ✅ bootstrap.ts (177→178); ⚠️ Abortive: signal.ts (381/382 push fails).

### Iters 367–378 — ✅ (157→177): multivariate (PCA/Mahalanobis), contingency tables, regression (OLS/polyfit), hypothesis_tests (ttest/chi2/ANOVA/KS), bootstrap, sparse, to_excel, feather, hdf, pd.arrays (7 masked types), holiday calendars, offsets/frequencies, read_sas.

### Iters 1–366 — ✅ (0→157): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index, sql, xml, stata, parquet, fwf, excel, feather, and more.

