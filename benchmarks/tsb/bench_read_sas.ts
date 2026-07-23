/**
 * Benchmark: readSas — parse a 1,000-row SAS XPORT (XPT) file.
 * Outputs JSON: {"function": "read_sas", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { readSas } from "../../src/index.ts";

// ─── IBM 370 floating-point encoder ──────────────────────────────────────────

function ibmEncode(val: number): Uint8Array {
  const out = new Uint8Array(8);
  if (val === 0) return out;
  if (!Number.isFinite(val)) { out[0] = 0x2e; return out; }
  const sign = val < 0 ? 1 : 0;
  const abs = Math.abs(val);
  let exp = 0;
  let mant = abs;
  while (mant >= 1) { mant /= 16; exp++; }
  while (mant < 1 / 16 && mant > 0) { mant *= 16; exp--; }
  const mantInt = BigInt(Math.round(mant * 2 ** 56));
  out[0] = (sign << 7) | ((exp + 64) & 0x7f);
  for (let i = 1; i <= 7; i++) {
    out[i] = Number((mantInt >> BigInt((7 - i) * 8)) & 0xffn);
  }
  return out;
}

// ─── Minimal XPORT v5 builder ────────────────────────────────────────────────

function buildXpt(
  numVars: readonly string[],
  charVars: readonly { name: string; len: number }[],
  rows: readonly Readonly<Record<string, number | string>>[],
): Uint8Array {
  const RECORD = 80;

  function encodeAscii(s: string, maxLen: number): Uint8Array {
    const buf = new Uint8Array(maxLen);
    for (let i = 0; i < Math.min(s.length, maxLen); i++) buf[i] = s.charCodeAt(i) & 0x7f;
    return buf;
  }
  function padTo80(s: string): Uint8Array { return encodeAscii(s.padEnd(RECORD, " "), RECORD); }
  function writeU16(b: Uint8Array, o: number, v: number) { b[o] = (v >> 8) & 0xff; b[o + 1] = v & 0xff; }
  function writeU32(b: Uint8Array, o: number, v: number) {
    b[o] = (v >> 24) & 0xff; b[o + 1] = (v >> 16) & 0xff; b[o + 2] = (v >> 8) & 0xff; b[o + 3] = v & 0xff;
  }

  type Meta = { type: 1 | 2; name: string; len: number; pos: number };
  const metas: Meta[] = [];
  let pos = 0;
  for (const name of numVars) { metas.push({ type: 1, name, len: 8, pos }); pos += 8; }
  for (const { name, len } of charVars) { metas.push({ type: 2, name, len, pos }); pos += len; }
  const rowLen = pos;

  const chunks: Uint8Array[] = [];

  // Library header (5 × 80 bytes)
  chunks.push(padTo80("HEADER RECORD*******LIBRARY HEADER RECORD!!!!!!!000000000000000000000000000000  "));
  chunks.push(padTo80("SAS     SAS     SASLIB  6.06    ASCII"));
  chunks.push(padTo80("20240101"));
  chunks.push(padTo80(""));
  chunks.push(padTo80(""));

  // Member header (3 × 80 bytes)
  chunks.push(padTo80("HEADER RECORD*******MEMBER  HEADER RECORD!!!!!!!000000000000000000000000000001600000000140  "));
  chunks.push(padTo80("SAS     BENCH   SASDATA 6.06    ASCII"));
  chunks.push(padTo80(""));

  // Namestr header
  const nvar = metas.length;
  chunks.push(padTo80(`HEADER RECORD*******NAMESTR HEADER RECORD!!!!!!!${String(nvar).padStart(6, "0")}00000000000000000000  `));

  // Namestr records (140 bytes each)
  const nsBuf = new Uint8Array(nvar * 140);
  for (let i = 0; i < metas.length; i++) {
    const m = metas[i]!;
    const off = i * 140;
    writeU16(nsBuf, off, m.type);
    writeU16(nsBuf, off + 2, 140);
    nsBuf.set(encodeAscii(m.name, 8), off + 4);
    writeU16(nsBuf, off + 52, m.len);
    writeU32(nsBuf, off + 84, m.pos);
  }
  const nsPadded = Math.ceil(nsBuf.length / RECORD) * RECORD;
  const nsPaddedBuf = new Uint8Array(nsPadded);
  nsPaddedBuf.set(nsBuf);
  chunks.push(nsPaddedBuf);

  // Obs header
  chunks.push(padTo80("HEADER RECORD*******OBS     HEADER RECORD!!!!!!!000000000000000000000000000000  "));

  // Observations
  const paddedRowLen = Math.ceil(rowLen / RECORD) * RECORD;
  const obsBuf = new Uint8Array(rows.length * paddedRowLen);
  for (let r = 0; r < rows.length; r++) {
    const base = r * paddedRowLen;
    const row = rows[r]!;
    for (const m of metas) {
      const val = row[m.name];
      if (m.type === 1) {
        const encoded = ibmEncode(typeof val === "number" ? val : 0);
        obsBuf.set(encoded, base + m.pos);
      } else {
        const s = typeof val === "string" ? val : "";
        obsBuf.set(encodeAscii(s, m.len), base + m.pos);
      }
    }
  }
  chunks.push(obsBuf);

  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

// ─── Build dataset ────────────────────────────────────────────────────────────

const ROWS = 1_000;
const WARMUP = 3;
const ITERATIONS = 20;

const rows: Readonly<Record<string, number | string>>[] = Array.from({ length: ROWS }, (_, i) => ({
  id: i,
  value: i * 1.5,
  score: Math.sin(i * 0.01),
  label: `item_${i % 100}`,
}));

const xpt = buildXpt(["id", "value", "score"], [{ name: "label", len: 12 }], rows);

// ─── Benchmark ────────────────────────────────────────────────────────────────

for (let i = 0; i < WARMUP; i++) readSas(xpt);

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) readSas(xpt);
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "read_sas",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
