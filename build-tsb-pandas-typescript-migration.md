# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-17T07:36:27Z |
| Iteration Count | 416 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, accepted, accepted, accepted, accepted, pending-ci, accepted, accepted |

---

## 🎯 Current Priorities

- Next: cross-spectral density, Lomb-Scargle periodogram, seasonal forecast evaluation (MASE, MSIS)

---

## 📚 Lessons Learned

- **MSTL/TBATS (416)**: iterative STL per period; TBATS Fourier state-space + Box-Cox (Guerrero) + ARMA (Yule-Walker+OLS). `[arP,arQ] as [number,number]` for tuple. No `(M[r] as T)[c]` — use `const row = M[r]; if (!row) continue`. Baseline after 52-commit rebase = 193; +2 files = 195.
- **ARIMAX/CSD/STL (415)**: LOESS cycle-subseries→lowpass→trend. Bisquare robustness. Guerrero λ estimation. Rebase brought baseline 195→194; +2 files = 196.
- **Cointegration (414)**: Engle-Granger (OLS+ADF) + Johansen (Cholesky+QR eigSym). MacKinnon p-values.
- **MarkovSwitching (413)**: Hamilton filter + Kim smoother + EM. WLS per regime. `readonly T[]`→`?? 0`.
- **HMM (410)**: Forward-backward log-space. `noUncheckedIndexedAccess`→`?? 0`. `exactOptionalPropertyTypes`: no optional spread.
- **General TS**: `?? 0` everywhere. `slice()` on `readonly T[]`. Always push via `push_to_pull_request_branch`. Metric = exported TS files (excl index.ts). +1 per new exported file.

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)
- Phantom commits: always push via `push_to_pull_request_branch`

---

## 🔭 Future Directions

- Transfer function / ARIMAX models (not yet on branch — iter 415 push was pending-ci)
- Cross-spectral density, Lomb-Scargle, seasonal evaluation metrics (MASE/MSIS)
- Spectral analysis (Welch periodogram already done in signal.ts)

---

## 📊 Iteration History

### Iter 416 — 2026-07-17 07:36 UTC — [Run §29563477051](https://github.com/githubnext/tsb/actions/runs/29563477051)
- **Status**: ⏳ Pending CI | **Change**: STL/MSTL multi-seasonal decomposition + classical decomp + stlForecast; TBATS model (Fourier seasonality, Box-Cox, ARMA, damped trend)
- **Metric**: 195 (prev best: 196, delta: -1 vs state / +2 vs branch baseline of 193) | **Commit**: 5ba2fc2

### Iter 415 — 2026-07-16 19:24 UTC — [Run §29527556660](https://github.com/githubnext/tsb/actions/runs/29527556660)
- **Status**: ⏳ Pending CI | **Change**: ARIMAX model (CSS+Nelder-Mead), cross-spectral density + coherence + Lomb-Scargle, STL decomposition + classical decompose
- **Metric**: 196 (prev: 195, delta: +1) | **Commit**: f10df79

### Iters 407–414: ✅ DLM(407), Granger(412), MarkovSwitch(413), Cointegration(414). Also SARIMA(411), HMM(410). Phantom 408-409. Metric 191→195.
### Iters 1–406: (0→191) Core, stats, io, window, groupby, reshape, merge, tseries, wasm, playground.
