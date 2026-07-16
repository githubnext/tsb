# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-16T19:24:21Z |
| Iteration Count | 415 |
| Best Metric | 196 |
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
| Recent Statuses | pending-ci, pending-ci, accepted, accepted, accepted, accepted, pending-ci, accepted, accepted, accepted |

---

## 🎯 Current Priorities

- Next: STL enhancements (MSTL, robust variants), TBATS model

---

## 📚 Lessons Learned

- **ARIMAX/CSD/STL (415)**: ARIMAX: CSS via Nelder-Mead + Yule-Walker init; exogenous via OLS profiling; `(arr[t-1-i] ?? 0)` everywhere. CSD: Welch segmented FFT, one-sided spectrum; coherence = |Gxy|²/(Gxx·Gyy). STL: LOESS inner loop (cycle-subseries → low-pass → trend); outer robustness weights via bi-square. Rebase with 52 main commits brought baseline from 195→194; added 2 files (cross_spectral.ts, stl.ts) to reach 196.
- **Cointegration (414)**: Engle-Granger two-step (OLS residuals + ADF) + Johansen (generalized eigenvalue via Cholesky + QR-iteration eigSym). `geig` requires Cholesky of S11 then symmetric eig of L⁻¹·A·L⁻ᵀ. MacKinnon (2010) ADF p-value approximation. CV tables from Osterwald-Lenum (1992).
- **MarkovSwitching (413)**: Hamilton filter (forward) + Kim smoother (backward) inside EM. WLS via normal equations per regime for intercept+AR. `noUncheckedIndexedAccess`→`?? 0` everywhere. `readonly T[]` types for fit results.
- **HMM (410)**: Forward-backward in log-space via logSumExp. `noUncheckedIndexedAccess`: `arr[i] = (arr[i] ?? 0) + v`. `exactOptionalPropertyTypes`: avoid optional spread.
- **General TS**: `noUncheckedIndexedAccess`→`?? 0`. `slice()` on `readonly T[]`→mutable. Always push via `push_to_pull_request_branch`. Metric = `find src -name '*.ts' -not -name 'index.ts' | xargs grep -l 'export' | wc -l` (+1 per new exported file).
- **Models 405-409**: VAR (Yule-Walker multivariate), Prophet decomposition, DLM (Joseph-form + RTS), GARCH (softplus+Nelder-Mead), Copulas (Cholesky/Marshall-Olkin).

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)
- Phantom commits: always push via `push_to_pull_request_branch`

---

## 🔭 Future Directions

- Transfer function / ARIMAX models
- Spectral analysis (Welch periodogram already done in signal.ts)

---

## 📊 Iteration History

### Iter 415 — 2026-07-16 19:24 UTC — [Run §29527556660](https://github.com/githubnext/tsb/actions/runs/29527556660)
- **Status**: ⏳ Pending CI | **Change**: ARIMAX model (CSS+Nelder-Mead), cross-spectral density + coherence + Lomb-Scargle, STL decomposition + classical decompose
- **Metric**: 196 (prev: 195, delta: +1) | **Commit**: f10df79

### Iters 407–414: ✅ DLM(407), Granger(412), MarkovSwitch(413), Cointegration(414). Also SARIMA(411), HMM(410). Phantom 408-409. Metric 191→195.
### Iters 1–406: (0→191) Core, stats, io, window, groupby, reshape, merge, tseries, wasm, playground.
