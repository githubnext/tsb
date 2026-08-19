import pandas as pd
import json
import time

N = 10_000
WARMUP = 5
ITERS = 100

a = [i % 1000 * 0.5 for i in range(N)]
b = [i % 750 * 0.7 for i in range(N)]
df = pd.DataFrame({
    "x": a,
    "y": b,
    "z": [v * 2 for v in a],
    "w": [v + 1 for v in b],
})
df2 = pd.DataFrame({
    "x": b,
    "y": a,
    "z": [v * 2 for v in b],
    "w": [v + 1 for v in a],
})

def bench():
    df.eq(250)
    df.ne(250)
    df.lt(300)
    df.gt(100)
    df.le(500)
    df.ge(50)
    df.eq(df2)
    df.lt(df2)

for _ in range(WARMUP):
    bench()

start = time.perf_counter()
for _ in range(ITERS):
    bench()
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "compare_dataframe",
    "mean_ms": total_ms / ITERS,
    "iterations": ITERS,
    "total_ms": total_ms,
}))
