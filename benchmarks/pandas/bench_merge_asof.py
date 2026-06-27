"""Benchmark: merge_asof — backward asof join of two 10k-row sorted DataFrames"""
import json
import time
import pandas as pd

N = 10_000
WARMUP = 3
ITERATIONS = 10

# Trades sorted by time: 0, 2, 4, ...
trade_times = list(range(0, N * 2, 2))
prices = [100.0 + i * 0.5 for i in range(N)]

# Quotes sorted by time, sparser: 0, 3, 6, ...
quote_times = list(range(0, N * 3, 3))
bids = [99.0 + i * 0.5 for i in range(N)]

trades = pd.DataFrame({"time": trade_times, "price": prices})
quotes = pd.DataFrame({"time": quote_times, "bid": bids})

for _ in range(WARMUP):
    pd.merge_asof(trades, quotes, on="time")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.merge_asof(trades, quotes, on="time")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "merge_asof",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
