/**
 * Tests for io/read_sas — SAS XPORT format reader.
 *
 * Covers:
 * - readSas with manually constructed XPORT buffers
 * - Numeric variables (IBM 370 floating-point conversion)
 * - Character variables (fixed-width ASCII)
 * - Empty datasets
 * - Error handling for invalid input
 */

import { describe, expect, test } from "bun:test";
import { readSas } from "../../src/io/read_sas.ts";

// ─── IBM 370 floating-point helpers ───────────────────────────────────────────

/** Encode a JavaScript number as IBM 370 double (8 bytes, big-endian). */
function ibmEncode(val: number): Uint8Array {
  const out = new Uint8Array(8);
  if (val === 0) {
    return out;
  }
  if (!Number.isFinite(val)) {
    out[0] = 0x2e;
    return out;
  }
  const sign = val < 0 ? 1 : 0;
  const abs = Math.abs(val);

  // Find base-16 exponent so that 1/16 <= mantissa < 1
  let exp = 0;
  let mant = abs;
  while (mant >= 1) {
    mant /= 16;
    exp++;
  }
  while (mant < 1 / 16 && mant > 0) {
    mant *= 16;
    exp--;
  }

  const mantInt = BigInt(Math.round(mant * 2 ** 56));
  out[0] = (sign << 7) | ((exp + 64) & 0x7f);
  for (let i = 1; i <= 7; i++) {
    out[i] = Number((mantInt >> BigInt((7 - i) * 8)) & 0xffn);
  }
  return out;
}

// ─── XPORT builder ────────────────────────────────────────────────────────────

type VarDef = { type: "num"; name: string } | { type: "char"; name: string; len: number };

/**
 * Build a minimal but valid SAS XPORT v5 file in memory.
 *
 * @param vars   Variable definitions.
 * @param rows   Array of row objects (values as number | string | null).
 */
function buildXpt(
  vars: readonly VarDef[],
  rows: readonly Readonly<Record<string, number | string | null>>[],
): Uint8Array {
  const RECORD = 80;

  function padTo80(s: string): string {
    return s.padEnd(RECORD, " ");
  }

  function encodeAscii(s: string, maxLen: number): Uint8Array {
    const buf = new Uint8Array(maxLen);
    for (let i = 0; i < Math.min(s.length, maxLen); i++) {
      buf[i] = s.charCodeAt(i) & 0x7f;
    }
    return buf;
  }

  function writeUint16BE(buf: Uint8Array, off: number, val: number): void {
    buf[off] = (val >> 8) & 0xff;
    buf[off + 1] = val & 0xff;
  }

  function writeUint32BE(buf: Uint8Array, off: number, val: number): void {
    buf[off] = (val >> 24) & 0xff;
    buf[off + 1] = (val >> 16) & 0xff;
    buf[off + 2] = (val >> 8) & 0xff;
    buf[off + 3] = val & 0xff;
  }

  const chunks: Uint8Array[] = [];

  // ── Library header (5 × 80 bytes) ──────────────────────────────────────
  const LIB_HDR =
    "HEADER RECORD*******LIBRARY HEADER RECORD!!!!!!!000000000000000000000000000000  ";
  chunks.push(encodeAscii(padTo80(LIB_HDR), RECORD));
  chunks.push(encodeAscii(padTo80("SAS     SAS     SASLIB  6.06    ASCII"), RECORD));
  chunks.push(encodeAscii(padTo80("20240101"), RECORD));
  chunks.push(encodeAscii(padTo80(""), RECORD));
  chunks.push(encodeAscii(padTo80(""), RECORD));

  // ── Member header (2 × 80 bytes) ───────────────────────────────────────
  const MBR_HDR =
    "HEADER RECORD*******MEMBER  HEADER RECORD!!!!!!!000000000000000000000000000001600000000140  ";
  chunks.push(encodeAscii(padTo80(MBR_HDR), RECORD));
  chunks.push(encodeAscii(padTo80("SAS     TEST    SASDATA 6.06    ASCII"), RECORD));
  chunks.push(encodeAscii(padTo80(""), RECORD));

  // ── Namestr header ───────────────────────────────────────────────────────
  const nvar = vars.length;
  const nvarStr = String(nvar).padStart(6, "0");
  const NS_HDR = `HEADER RECORD*******NAMESTR HEADER RECORD!!!!!!!${nvarStr}00000000000000000000  `;
  chunks.push(encodeAscii(padTo80(NS_HDR), RECORD));

  // ── Namestr records (each 140 bytes, pack into 80-byte records) ──────────
  // Compute variable positions.
  interface VarMeta {
    type: 1 | 2;
    name: string;
    len: number;
    pos: number;
  }
  const metas: VarMeta[] = [];
  let pos = 0;
  for (const v of vars) {
    const len = v.type === "num" ? 8 : v.len;
    metas.push({ type: v.type === "num" ? 1 : 2, name: v.name, len, pos });
    pos += len;
  }
  const rowLen = pos;

  const nsBuf = new Uint8Array(nvar * 140);
  for (let i = 0; i < metas.length; i++) {
    const meta = metas[i];
    if (meta === undefined) {
      continue;
    }
    const off = i * 140;
    writeUint16BE(nsBuf, off, meta.type); // ntype
    writeUint16BE(nsBuf, off + 2, 140); // nhfill
    const nameBytes = encodeAscii(meta.name, 8);
    nsBuf.set(nameBytes, off + 4);
    writeUint16BE(nsBuf, off + 52, meta.len); // nfl
    writeUint32BE(nsBuf, off + 84, meta.pos); // npos
  }
  // Pad to 80-byte boundary.
  const nsPadded = Math.ceil(nsBuf.length / RECORD) * RECORD;
  const nsPaddedBuf = new Uint8Array(nsPadded);
  nsPaddedBuf.set(nsBuf);
  chunks.push(nsPaddedBuf);

  // ── Obs header ───────────────────────────────────────────────────────────
  const OBS_HDR =
    "HEADER RECORD*******OBS     HEADER RECORD!!!!!!!000000000000000000000000000000  ";
  chunks.push(encodeAscii(padTo80(OBS_HDR), RECORD));

  // ── Observations ─────────────────────────────────────────────────────────
  const paddedRowLen = Math.ceil(rowLen / RECORD) * RECORD;
  const obsBuf = new Uint8Array(rows.length * paddedRowLen);

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row === undefined) {
      continue;
    }
    const base = r * paddedRowLen;
    for (const meta of metas) {
      const val = row[meta.name] ?? null;
      if (meta.type === 1) {
        // Numeric
        const num = val === null ? Number.NaN : Number(val);
        const encoded = ibmEncode(num);
        obsBuf.set(encoded, base + meta.pos);
      } else {
        // Character
        const str = val === null ? "" : String(val);
        const encoded = encodeAscii(str, meta.len);
        obsBuf.set(encoded, base + meta.pos);
      }
    }
  }
  chunks.push(obsBuf);

  // ── Concatenate all chunks ────────────────────────────────────────────────
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("readSas — error handling", () => {
  test("throws for non-XPORT data", () => {
    const buf = new TextEncoder().encode("hello world");
    expect(() => readSas(buf)).toThrow(/not a valid SAS XPORT/);
  });

  test("throws for empty buffer", () => {
    expect(() => readSas(new Uint8Array(0))).toThrow();
  });
});

describe("readSas — numeric variables", () => {
  test("reads a single numeric column", () => {
    const buf = buildXpt([{ type: "num", name: "X" }], [{ X: 1 }, { X: 2 }, { X: 3 }]);
    const df = readSas(buf);
    expect(df.shape[0]).toBe(3);
    expect(df.shape[1]).toBe(1);
    expect([...df.col("X").values]).toEqual([1, 2, 3]);
  });

  test("reads multiple numeric columns", () => {
    const buf = buildXpt(
      [
        { type: "num", name: "A" },
        { type: "num", name: "B" },
      ],
      [
        { A: 10, B: 20 },
        { A: 30, B: 40 },
      ],
    );
    const df = readSas(buf);
    expect(df.shape).toEqual([2, 2]);
    expect([...df.col("A").values]).toEqual([10, 30]);
    expect([...df.col("B").values]).toEqual([20, 40]);
  });

  test("IBM floating point: value 1.0 round-trips", () => {
    const buf = buildXpt([{ type: "num", name: "V" }], [{ V: 1.0 }]);
    const df = readSas(buf);
    const val = df.col("V").values[0];
    expect(typeof val).toBe("number");
    expect(Math.abs((val as number) - 1.0)).toBeLessThan(1e-6);
  });

  test("IBM floating point: value 3.14159 round-trips within tolerance", () => {
    const buf = buildXpt([{ type: "num", name: "PI" }], [{ PI: Math.PI }]);
    const df = readSas(buf);
    const val = df.col("PI").values[0];
    expect(typeof val).toBe("number");
    expect(Math.abs((val as number) - Math.PI)).toBeLessThan(0.001);
  });

  test("missing numeric values become null", () => {
    const buf = buildXpt([{ type: "num", name: "X" }], [{ X: null }]);
    const df = readSas(buf);
    expect(df.col("X").values[0]).toBeNull();
  });

  test("zero is correctly decoded", () => {
    const buf = buildXpt([{ type: "num", name: "Z" }], [{ Z: 0 }]);
    const df = readSas(buf);
    expect(df.col("Z").values[0]).toBe(0);
  });
});

describe("readSas — character variables", () => {
  test("reads a character column", () => {
    const buf = buildXpt(
      [{ type: "char", name: "NAME", len: 8 }],
      [{ NAME: "Alice" }, { NAME: "Bob" }],
    );
    const df = readSas(buf);
    expect(df.shape[0]).toBe(2);
    expect([...df.col("NAME").values]).toEqual(["Alice", "Bob"]);
  });

  test("character column is right-trimmed", () => {
    const buf = buildXpt([{ type: "char", name: "X", len: 8 }], [{ X: "Hi" }]);
    const df = readSas(buf);
    const val = df.col("X").values[0];
    expect(val).toBe("Hi"); // no trailing spaces
  });
});

describe("readSas — mixed columns", () => {
  test("reads mixed numeric and character columns", () => {
    const buf = buildXpt(
      [
        { type: "char", name: "ID", len: 4 },
        { type: "num", name: "AGE" },
      ],
      [
        { ID: "A001", AGE: 25 },
        { ID: "A002", AGE: 30 },
      ],
    );
    const df = readSas(buf);
    expect(df.shape).toEqual([2, 2]);
    expect([...df.col("ID").values]).toEqual(["A001", "A002"]);
    const ages = [...df.col("AGE").values];
    expect(Math.abs((ages[0] as number) - 25)).toBeLessThan(0.01);
    expect(Math.abs((ages[1] as number) - 30)).toBeLessThan(0.01);
  });
});

describe("readSas — empty dataset", () => {
  test("no rows returns empty DataFrame", () => {
    const buf = buildXpt([{ type: "num", name: "X" }], []);
    const df = readSas(buf);
    expect(df.shape[0]).toBe(0);
  });
});

describe("readSas — string input", () => {
  test("accepts string input", () => {
    // Build then convert to string.
    const buf = buildXpt([{ type: "num", name: "V" }], [{ V: 42 }]);
    const str = Array.from(buf)
      .map((b) => String.fromCharCode(b))
      .join("");
    const df = readSas(str);
    expect(df.shape[0]).toBe(1);
    const val = df.col("V").values[0];
    expect(Math.abs((val as number) - 42)).toBeLessThan(0.01);
  });
});
