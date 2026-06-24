"""
Benchmark: FixedForwardWindowIndexer and custom variable-offset BaseIndexer via rolling.

Mirrors tsb FixedForwardWindowIndexer, VariableOffsetWindowIndexer, and applyIndexer.
Uses a 50k-row Series. Each iteration:
- Applies rolling(FixedForwardWindowIndexer(window_size=5)).sum() (forward-looking).
- Applies rolling(custom IntegerOffsetIndexer).sum() (variable look-back, mirrors tsb).
Outputs JSON: {"function": "window_indexers", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd
from pandas.api.indexers import BaseIndexer, FixedForwardWindowIndexer


class IntegerOffsetIndexer(BaseIndexer):
    """Variable look-back window where each row uses a per-row integer offset."""

    def __init__(self, offsets):
        super().__init__()
        self._offsets = offsets

    def get_window_bounds(self, num_values=0, min_periods=None, center=None, closed=None, step=1):
        start = np.empty(num_values, dtype=np.int64)
        end = np.empty(num_values, dtype=np.int64)
        for i in range(num_values):
            offset = self._offsets[i % len(self._offsets)]
            start[i] = max(0, i - offset)
            end[i] = i + 1
        return start, end


SIZE = 50_000
WARMUP = 5
ITERATIONS = 50

values = [(i * 0.1) % 100 for i in range(SIZE)]
s = pd.Series(values)

fwd_indexer = FixedForwardWindowIndexer(window_size=5)
offsets = [(i % 10) + 1 for i in range(SIZE)]
var_indexer = IntegerOffsetIndexer(offsets=offsets)

for _ in range(WARMUP):
    s.rolling(fwd_indexer).sum()
    s.rolling(var_indexer).sum()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.rolling(fwd_indexer).sum()
    s.rolling(var_indexer).sum()
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "window_indexers",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
