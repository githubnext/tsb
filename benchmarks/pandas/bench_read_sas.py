"""
Benchmark: pd.read_sas — parse a 1,000-row SAS XPORT (XPT) file.
Outputs JSON: {"function": "read_sas", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import io
import struct
import math
import numpy as np
import pandas as pd

ROWS = 1_000
WARMUP = 3
ITERATIONS = 20

# ── IBM 370 double encoder ────────────────────────────────────────────────────

def ibm_encode(val: float) -> bytes:
    if val == 0.0:
        return b"\x00" * 8
    if not math.isfinite(val):
        return b"\x2e" + b"\x00" * 7
    sign = 1 if val < 0 else 0
    abs_val = abs(val)
    exp = 0
    mant = abs_val
    while mant >= 1.0:
        mant /= 16
        exp += 1
    while mant < 1.0 / 16 and mant > 0:
        mant *= 16
        exp -= 1
    mant_int = round(mant * 2**56)
    out = bytearray(8)
    out[0] = (sign << 7) | ((exp + 64) & 0x7f)
    for i in range(1, 8):
        out[i] = (mant_int >> ((7 - i) * 8)) & 0xff
    return bytes(out)

# ── Minimal XPORT v5 builder ─────────────────────────────────────────────────

def build_xpt(num_vars, char_vars, rows_data):
    RECORD = 80

    def pad80(s):
        return s.ljust(RECORD).encode("ascii")[:RECORD]

    def write_u16(val):
        return struct.pack(">H", val)

    def write_u32(val):
        return struct.pack(">I", val)

    # Compute variable metadata
    metas = []
    pos = 0
    for name in num_vars:
        metas.append({"type": 1, "name": name, "len": 8, "pos": pos})
        pos += 8
    for name, length in char_vars:
        metas.append({"type": 2, "name": name, "len": length, "pos": pos})
        pos += length
    row_len = pos

    chunks = bytearray()

    # Library header (5 × 80 bytes)
    chunks += pad80("HEADER RECORD*******LIBRARY HEADER RECORD!!!!!!!000000000000000000000000000000  ")
    chunks += pad80("SAS     SAS     SASLIB  6.06    ASCII")
    chunks += pad80("20240101")
    chunks += pad80("")
    chunks += pad80("")

    # Member header (3 × 80 bytes)
    chunks += pad80("HEADER RECORD*******MEMBER  HEADER RECORD!!!!!!!000000000000000000000000000001600000000140  ")
    chunks += pad80("SAS     BENCH   SASDATA 6.06    ASCII")
    chunks += pad80("")

    # Namestr header
    nvar = len(metas)
    chunks += pad80(f"HEADER RECORD*******NAMESTR HEADER RECORD!!!!!!!{nvar:06d}00000000000000000000  ")

    # Namestr records (140 bytes each)
    ns_buf = bytearray(nvar * 140)
    for i, m in enumerate(metas):
        off = i * 140
        ns_buf[off:off+2] = write_u16(m["type"])
        ns_buf[off+2:off+4] = write_u16(140)
        name_bytes = m["name"].encode("ascii").ljust(8)[:8]
        ns_buf[off+4:off+12] = name_bytes
        ns_buf[off+52:off+54] = write_u16(m["len"])
        ns_buf[off+84:off+88] = write_u32(m["pos"])
    padded_ns = math.ceil(len(ns_buf) / RECORD) * RECORD
    ns_buf_padded = ns_buf.ljust(padded_ns, b"\x00")
    chunks += ns_buf_padded

    # Obs header
    chunks += pad80("HEADER RECORD*******OBS     HEADER RECORD!!!!!!!000000000000000000000000000000  ")

    # Observations
    padded_row_len = math.ceil(row_len / RECORD) * RECORD
    obs_buf = bytearray(len(rows_data) * padded_row_len)
    for r, row in enumerate(rows_data):
        base = r * padded_row_len
        for m in metas:
            val = row.get(m["name"])
            if m["type"] == 1:
                encoded = ibm_encode(float(val) if val is not None else 0.0)
                obs_buf[base + m["pos"]:base + m["pos"] + 8] = encoded
            else:
                s = str(val) if val is not None else ""
                b = s.encode("ascii")[:m["len"]].ljust(m["len"], b" ")
                obs_buf[base + m["pos"]:base + m["pos"] + m["len"]] = b

    chunks += obs_buf
    return bytes(chunks)


# ── Build dataset ─────────────────────────────────────────────────────────────

rows_data = [
    {"id": float(i), "value": i * 1.5, "score": math.sin(i * 0.01), "label": f"item_{i % 100}"}
    for i in range(ROWS)
]

xpt_bytes = build_xpt(
    ["id", "value", "score"],
    [("label", 12)],
    rows_data,
)

# ── Benchmark ─────────────────────────────────────────────────────────────────

for _ in range(WARMUP):
    pd.read_sas(io.BytesIO(xpt_bytes), format="xport")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.read_sas(io.BytesIO(xpt_bytes), format="xport")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "read_sas",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
