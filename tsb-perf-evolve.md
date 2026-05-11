# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-11T18:50:34Z |
| Iteration Count | 40 |
| Best Metric | 21.048 |
| Target Metric | — |
| Metric Direction | lower |
| Branch | autoloop/tsb-perf-evolve |
| PR | — |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci, pending-ci, rejected, pending-ci, pending-ci |

## 🧬 Population

### c040 · island 3 · fitness pending-ci · gen 40

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c029/c035
- **Approach**: Inverse IEEE-754 gather — reconstruct float values from sorted AoS key words instead of `vals[origIdx]` random reads into holey JS Array. _fvalsU32[0..1]/_fvals[0] used as 1-element scratch.
- **Status**: ⏳ pending CI evaluation

### ~~c039~~ (evicted — never committed to branch; iteration 39 run produced no candidate)

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c029
- *(code never committed)*

### c038 · island 3 · fitness 11.721 (noise) · gen 38

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c035
- **Approach**: 4-pass hi-word 8-bit radix + O(n) insertion sort tie-break for equal-hi groups.
- **Status**: ❌ rejected — tsb 116-118ms unchanged vs c035's 112ms; pandas ran slow (10ms), inflating ratio.

### c029 · island 3 · fitness 21.048 · gen 29 — BEST

- **Approach**: AoS scatter; all 3 writes/element on same cache line. tsb=112.50ms / pandas=5.34ms.
- **Status**: ✅ accepted — baseline for all future iterations.

### Iters 1–37 (condensed)

- c022 ✅ merged PR #226 (LSD 8-pass radix, fitness ~29); c035 ✅ merged PR #272 (merged histograms, fitness 21.048); c036/c037 superseded; c028 fitness 21.841; c027 ❌; c003 island 1 fitness 27.999; c030–c034 lost.

## 📚 Lessons Learned

- LSD radix 8-pass (IEEE-754 transform) beats comparator sort; bottleneck is NOT scatter pass count.
- Module-level TypedArray buffers eliminate GC; grow lazily, never shrink.
- Even pass count → result in _rxA (no final copy). AoS beats SoA for scatter writes.
- Merged histogram init (all 8 passes inline) saves one O(n) scan. Stride counter (si+=3) avoids multiply.
- RangeIndex fast path saves 100k bounds-checked at() calls.
- **Scatter pass count is NOT the bottleneck**: halving 8→4 passes gave no tsb speedup (c037/c038).
- Benchmark noise: pandas varies 4–10ms; only tsb_mean_ms decrease confirms real improvement.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.
- 4-pass hi-word radix + lo-word tie-break (c037, c038): tsb_mean_ms unchanged vs 8-pass (116-118ms vs 112ms). Scatter pass count is not the bottleneck; tie-break O(n) scan eats the savings.

## 🔭 Future Directions

- Profile what fraction of 112ms is: scatter writes vs gather vs JS/JIT overhead vs perm/outData allocation.
- Skip-pass: if a histogram bucket is 100% (all elements same byte), skip scatter without swap.
- Island 4 hybrid: native sort for n < 1k, radix for n ≥ 1k.
- If c040 inverse-transform gather helps: also try pre-allocating perm as module-level number[] to save one allocation.

## 📊 Iteration History

### Iteration 40 — 2026-05-11 18:50 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25690378732)

- **Status**: ⏳ Pending CI · c040 · exploitation · island 3
- **Change**: Inverse IEEE-754 gather — reconstruct float values from sorted AoS key words (`srcBuf[si+1]`, `srcBuf[si+2]`) using `_fvalsU32`/`_fvals[0]` scratch, eliminating `vals[origIdx]` random reads.
- **Metric**: pending CI evaluation (no bun in sandbox)

### Iteration 39 — 2026-05-11 02:37 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25647336180)

- **Status**: ❌ Not committed · c039 was proposed but never pushed to branch (prior run exited without committing)
- **Change**: N/A
- **Metric**: N/A

### Iters 1–38 — c022 ✅ (fitness ~29), c035 ✅ (fitness 21.048, best), c038 ❌ (4-pass radix no help), c036/c037 ❌
