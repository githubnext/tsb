import pandas as pd, time, json
N = 100_000
words = ["hello", "world", "typescript", "benchmark", "tsb"]
data = [words[i % len(words)] for i in range(N)]
s = pd.Series(data)
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    s.str.encode("utf-8").str.len()
t0 = time.perf_counter()
for _ in range(ITERS):
    s.str.encode("utf-8").str.len()
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "str_byte_length", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
