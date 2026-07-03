# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-03T08:19:06Z |
| Iteration Count | 393 |
| Best Metric | 188 |
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
| Recent Statuses | accepted, accepted, pending-ci, accepted, accepted, accepted, pending-ci, accepted, pending-ci, pending-ci |

---

## 🎯 Current Priorities

- Continue io/stats features: read_avro, state-space models (Kalman filter), ARIMA

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements`=error. `useNumberNamespace`. `useSimplifiedLogicExpression`. Fix in same commit.
- **TS**: `noUncheckedIndexedAccess` → `?? fallback`. `exactOptionalPropertyTypes`. biome-ignore for node:zlib.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). One new file = +1.
- **Stats math**: logGamma, regIncGamma, normalPpf reusable across modules.
- **FFT**: Cooley-Tukey radix-2 DIT; pad to nextPow2 for non-power-of-2. `Zxx[f]![t] = val`.
- **Filters**: Butterworth → bilinear SOS. filtfilt: reverse+sosfilt+reverse.
- **ORC**: Protobuf LSB-first varints for metadata; Hadoop VInt MSB-first for data streams. `scalarToLabel()` avoids `as`.
- **Wavelets (iter 393)**: DWT periodization uses `(2n+1-k) mod N` indexing. QMF relations: `loR=rev(loD)`, `hiD[n]=(-1)^(n+1)*loR[n]`, `hiR[n]=(-1)^n*loD[n]`. CWT: convolve signal with scaled Ricker/Morlet wavelets. Use `row !== undefined` guard instead of `as` cast for 2D array writes. Fix pre-existing `new Series({data:...})` vs `new Series([...])` in acf_pacf.test.ts.
- **ACF/PACF (iter 392)**: Use `noNonNullAssertion`-safe destructuring for polynomial coefficients. Split `regIncGamma` into series + CF helpers for `noExcessiveCognitiveComplexity`. Use `Number.NEGATIVE_INFINITY`/`Number.POSITIVE_INFINITY` not `-Infinity`/`Infinity`.
- **Lost Commits (iters 389–391)**: Commits were recorded as accepted but never reached the branch. Iter 392 re-implements `acf_pacf.ts` (previously planned for iter 389). The state file's `Best Metric` was over-counted (recorded 188, actual was 186 at baseline).

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)

---

## 📊 Iteration History

### Iteration 393 — 2026-07-03 08:19 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28646639178)

- **Status**: ⏳ Pending CI
- **Change**: Add `src/stats/wavelet.ts` — DWT/IDWT (Haar, Daubechies, Symlets, Coiflets), multi-level wavedec/waverec, 2D DWT/IDWT, CWT (Ricker/Morlet), threshold/visushrinkThreshold denoising. Also fix pre-existing acf_pacf.test.ts `new Series({data:...})` typecheck error.
- **Metric**: 188 (delta: +1)
- **Commit**: 8a6ba56
- **Notes**: Rebased branch onto main (9 commits ahead, 0 behind). QMF filters verified against PyWavelets. Round-trip DWT/IDWT property tested with fast-check.

### Iteration 392 — 2026-07-02 01:37 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28559220424)

- **Status**: ⏳ Pending CI
- **Change**: Add `src/stats/acf_pacf.ts` (autocorr, acf, pacf, ccf, durbinWatson, ljungBox, boxPierce) — ACF with Bartlett CI, PACF via Levinson-Durbin, portmanteau tests.
- **Metric**: 187 (baseline was 186, delta: +1). Note: state file's 188 was inflated from lost commits.
- **Commit**: b3dd88e
- **Notes**: Re-implements the lost iter 389 acf_pacf module. Branch was rebased onto current main (4 new commits from PRs #364/#365). Biome fixes: split regIncGamma into helpers, use destructuring for polynomial coefficients, use `Number.POSITIVE_INFINITY`.

### Iters 389–392 — ⚠️ Lost/Pending (183→187)
- 392: acf_pacf.ts (pending-ci). 391/390/389: lost commits (acf_pacf+arima).

### Iters 1–388 — ✅ (0→186)
- Core (Index, Series, DataFrame, Dtype), stats (signal, filters, orc, information, kde, bootstrap, multivariate, contingency, regression, hypothesis_tests), io (sparse, to_excel, feather, hdf, arrays, read_sas), and more.

