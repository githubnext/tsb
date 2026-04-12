"""Benchmark: DataFrame.stack() — pivot innermost column level to row index."""
import json, time
import pandas as pd

ROWS = 1_000
COLS = 20
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({f"c{j}": [float(i*j+0.5) for i in range(ROWS)] for j in range(1, COLS+1)})

for _ in range(WARMUP):
    df.stack()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.stack()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"stack","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
