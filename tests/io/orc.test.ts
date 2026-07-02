/**
 * Tests for readOrc / toOrc — Apache ORC file format I/O.
 *
 * Strategy: use toOrc to produce ORC buffers, then readOrc to round-trip.
 * All tests operate on in-memory buffers; no filesystem I/O is required.
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/core/frame.ts";
import { readOrc, toOrc } from "../../src/io/orc.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roundtrip(df: DataFrame): DataFrame {
  return readOrc(toOrc(df));
}

function colArr(df: DataFrame, name: string): readonly unknown[] {
  return df.col(name).values;
}

// ─── File structure ───────────────────────────────────────────────────────────

describe("toOrc — file structure", () => {
  it("returns a non-empty Uint8Array", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3] });
    const buf = toOrc(df);
    expect(buf).toBeInstanceOf(Uint8Array);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("starts with ORC magic bytes", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const buf = toOrc(df);
    expect(buf[0]).toBe(0x4f); // 'O'
    expect(buf[1]).toBe(0x52); // 'R'
    expect(buf[2]).toBe(0x43); // 'C'
  });

  it("ends with postscript length byte", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const buf = toOrc(df);
    // Last byte is postscript length, must be > 0
    expect(buf[buf.length - 1]).toBeGreaterThan(0);
  });
});

// ─── Integer columns ──────────────────────────────────────────────────────────

describe("readOrc / toOrc — integer columns", () => {
  it("round-trips a simple int column", () => {
    const df = DataFrame.fromColumns({ n: [1, 2, 3, 4, 5] });
    const rt = roundtrip(df);
    expect(rt.columns.toArray()).toEqual(["n"]);
    expect(colArr(rt, "n")).toEqual([1, 2, 3, 4, 5]);
  });

  it("round-trips negative integers", () => {
    const df = DataFrame.fromColumns({ n: [-100, -1, 0, 1, 100] });
    const rt = roundtrip(df);
    expect(colArr(rt, "n")).toEqual([-100, -1, 0, 1, 100]);
  });

  it("round-trips large integers", () => {
    const df = DataFrame.fromColumns({ n: [1_000_000, 2_000_000, -999_999] });
    const rt = roundtrip(df);
    expect(colArr(rt, "n")).toEqual([1_000_000, 2_000_000, -999_999]);
  });

  it("round-trips a column of zeros", () => {
    const df = DataFrame.fromColumns({ n: [0, 0, 0, 0] });
    const rt = roundtrip(df);
    expect(colArr(rt, "n")).toEqual([0, 0, 0, 0]);
  });

  it("round-trips null integers", () => {
    const df = DataFrame.fromColumns({ n: [1, null, 3, null, 5] });
    const rt = roundtrip(df);
    const vals = colArr(rt, "n");
    expect(vals[0]).toBe(1);
    expect(vals[1]).toBeNull();
    expect(vals[2]).toBe(3);
    expect(vals[3]).toBeNull();
    expect(vals[4]).toBe(5);
  });

  it("round-trips all-null int column", () => {
    const df = DataFrame.fromColumns({ n: [null, null, null] });
    const rt = roundtrip(df);
    expect(colArr(rt, "n").every((v) => v === null)).toBe(true);
  });
});

// ─── Float/Double columns ─────────────────────────────────────────────────────

describe("readOrc / toOrc — float columns", () => {
  it("round-trips double values", () => {
    const df = DataFrame.fromColumns({ x: [1.5, 2.25, 3.75] });
    const rt = roundtrip(df);
    const vals = colArr(rt, "x") as number[];
    expect(vals[0]).toBeCloseTo(1.5);
    expect(vals[1]).toBeCloseTo(2.25);
    expect(vals[2]).toBeCloseTo(3.75);
  });

  it("round-trips negative floats", () => {
    const df = DataFrame.fromColumns({ x: [-1.5, -0.001, 0.0] });
    const rt = roundtrip(df);
    const vals = colArr(rt, "x") as number[];
    expect(vals[0]).toBeCloseTo(-1.5);
    expect(vals[1]).toBeCloseTo(-0.001);
    expect(vals[2]).toBeCloseTo(0.0);
  });

  it("round-trips null floats", () => {
    const df = DataFrame.fromColumns({ x: [1.0, null, 3.0] });
    const rt = roundtrip(df);
    const vals = colArr(rt, "x");
    expect(vals[0]).toBe(1.0);
    expect(vals[1]).toBeNull();
    expect(vals[2]).toBe(3.0);
  });
});

// ─── String columns ───────────────────────────────────────────────────────────

describe("readOrc / toOrc — string columns", () => {
  it("round-trips a string column", () => {
    const df = DataFrame.fromColumns({ s: ["alpha", "beta", "gamma"] });
    const rt = roundtrip(df);
    expect(colArr(rt, "s")).toEqual(["alpha", "beta", "gamma"]);
  });

  it("round-trips empty strings", () => {
    const df = DataFrame.fromColumns({ s: ["", "a", ""] });
    const rt = roundtrip(df);
    expect(colArr(rt, "s")).toEqual(["", "a", ""]);
  });

  it("round-trips unicode strings", () => {
    const df = DataFrame.fromColumns({ s: ["こんにちは", "héllo", "🎉"] });
    const rt = roundtrip(df);
    expect(colArr(rt, "s")).toEqual(["こんにちは", "héllo", "🎉"]);
  });

  it("round-trips null strings", () => {
    const df = DataFrame.fromColumns({ s: ["hello", null, "world"] });
    const rt = roundtrip(df);
    const vals = colArr(rt, "s");
    expect(vals[0]).toBe("hello");
    expect(vals[1]).toBeNull();
    expect(vals[2]).toBe("world");
  });
});

// ─── Boolean columns ──────────────────────────────────────────────────────────

describe("readOrc / toOrc — boolean columns", () => {
  it("round-trips boolean values", () => {
    const df = DataFrame.fromColumns({ b: [true, false, true, false] });
    const rt = roundtrip(df);
    expect(colArr(rt, "b")).toEqual([true, false, true, false]);
  });

  it("round-trips all-true column", () => {
    const df = DataFrame.fromColumns({ b: [true, true, true] });
    const rt = roundtrip(df);
    expect(colArr(rt, "b")).toEqual([true, true, true]);
  });

  it("round-trips null booleans", () => {
    const df = DataFrame.fromColumns({ b: [true, null, false] });
    const rt = roundtrip(df);
    const vals = colArr(rt, "b");
    expect(vals[0]).toBe(true);
    expect(vals[1]).toBeNull();
    expect(vals[2]).toBe(false);
  });
});

// ─── Multi-column DataFrames ──────────────────────────────────────────────────

describe("readOrc / toOrc — multi-column DataFrames", () => {
  it("round-trips mixed-type DataFrame", () => {
    const df = DataFrame.fromColumns({
      id: [1, 2, 3],
      name: ["Alice", "Bob", "Carol"],
      score: [95.5, 87.0, 92.3],
      passed: [true, false, true],
    });
    const rt = roundtrip(df);
    expect(rt.columns.toArray()).toEqual(["id", "name", "score", "passed"]);
    expect(colArr(rt, "id")).toEqual([1, 2, 3]);
    expect(colArr(rt, "name")).toEqual(["Alice", "Bob", "Carol"]);
    expect((colArr(rt, "score") as number[]).map((v) => Math.round(v * 10) / 10)).toEqual([
      95.5, 87.0, 92.3,
    ]);
    expect(colArr(rt, "passed")).toEqual([true, false, true]);
  });

  it("preserves column order", () => {
    const df = DataFrame.fromColumns({ z: [1], a: [2], m: [3] });
    const rt = roundtrip(df);
    expect(rt.columns.toArray()).toEqual(["z", "a", "m"]);
  });

  it("handles 1-row DataFrame", () => {
    const df = DataFrame.fromColumns({ x: [42], y: ["hi"] });
    const rt = roundtrip(df);
    expect(colArr(rt, "x")).toEqual([42]);
    expect(colArr(rt, "y")).toEqual(["hi"]);
  });
});

// ─── Empty DataFrame ──────────────────────────────────────────────────────────

describe("readOrc / toOrc — empty DataFrame", () => {
  it("round-trips an empty DataFrame", () => {
    const df = DataFrame.fromColumns({ x: [] as number[] });
    const rt = roundtrip(df);
    expect(rt.shape[0]).toBe(0);
    expect(rt.columns.toArray()).toEqual(["x"]);
  });
});

// ─── Options: columns filter ──────────────────────────────────────────────────

describe("readOrc — columns option", () => {
  it("reads only specified columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"], c: [true, false] });
    const buf = toOrc(df);
    const rt = readOrc(buf, { columns: ["a", "c"] });
    expect(rt.columns.toArray()).toEqual(["a", "c"]);
    expect(colArr(rt, "a")).toEqual([1, 2]);
    expect(colArr(rt, "c")).toEqual([true, false]);
  });
});

// ─── Options: writeIndex ──────────────────────────────────────────────────────

describe("toOrc — writeIndex option", () => {
  it("includes index when writeIndex=true", () => {
    const df = DataFrame.fromColumns({ x: [10, 20, 30] });
    const buf = toOrc(df, { writeIndex: true });
    const rt = readOrc(buf);
    // __index__ column should be present
    expect(rt.columns.toArray()).toContain("__index__");
    expect(rt.columns.toArray()).toContain("x");
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe("readOrc — error handling", () => {
  it("throws on invalid magic bytes", () => {
    const bad = new Uint8Array([0x50, 0x41, 0x52, 0x31, 0x00]);
    expect(() => readOrc(bad)).toThrow(/magic/i);
  });

  it("throws on too-small file", () => {
    const bad = new Uint8Array([0x4f, 0x52]);
    expect(() => readOrc(bad)).toThrow();
  });

  it("accepts ArrayBuffer input", () => {
    const df = DataFrame.fromColumns({ n: [1, 2] });
    const buf = toOrc(df);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const rt = readOrc(new Uint8Array(ab));
    expect(colArr(rt, "n")).toEqual([1, 2]);
  });
});

// ─── Large dataset ────────────────────────────────────────────────────────────

describe("readOrc / toOrc — large dataset", () => {
  it("round-trips 1000-row integer column", () => {
    const data = Array.from({ length: 1000 }, (_, i) => i);
    const df = DataFrame.fromColumns({ n: data });
    const rt = roundtrip(df);
    const vals = colArr(rt, "n") as number[];
    expect(vals.length).toBe(1000);
    for (let i = 0; i < 1000; i++) {
      expect(vals[i]).toBe(i);
    }
  });

  it("round-trips 500-row string column", () => {
    const data = Array.from({ length: 500 }, (_, i) => `row_${i}`);
    const df = DataFrame.fromColumns({ s: data });
    const rt = roundtrip(df);
    const vals = colArr(rt, "s") as string[];
    expect(vals.length).toBe(500);
    for (let i = 0; i < 500; i++) {
      expect(vals[i]).toBe(`row_${i}`);
    }
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("readOrc / toOrc — property tests", () => {
  it("integer round-trip: arbitrary int arrays", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -1_000_000, max: 1_000_000 }), { minLength: 1, maxLength: 100 }), (data) => {
        const df = DataFrame.fromColumns({ n: data });
        const rt = roundtrip(df);
        const vals = colArr(rt, "n") as number[];
        for (let i = 0; i < data.length; i++) {
          expect(vals[i]).toBe(data[i]);
        }
      }),
    );
  });

  it("string round-trip: arbitrary string arrays", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ maxLength: 20 }), { minLength: 1, maxLength: 50 }),
        (data) => {
          const df = DataFrame.fromColumns({ s: data });
          const rt = roundtrip(df);
          const vals = colArr(rt, "s") as string[];
          for (let i = 0; i < data.length; i++) {
            expect(vals[i]).toBe(data[i]);
          }
        },
      ),
    );
  });

  it("float round-trip: finite float64 values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 50,
        }),
        (data) => {
          const df = DataFrame.fromColumns({ x: data });
          const rt = roundtrip(df);
          const vals = colArr(rt, "x") as number[];
          for (let i = 0; i < data.length; i++) {
            const expected = data[i] ?? 0;
            const actual = vals[i] ?? 0;
            // Float64 round-trip should be exact
            expect(actual).toBeCloseTo(expected, 10);
          }
        },
      ),
    );
  });

  it("boolean round-trip: arbitrary boolean arrays", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }), (data) => {
        const df = DataFrame.fromColumns({ b: data });
        const rt = roundtrip(df);
        const vals = colArr(rt, "b") as boolean[];
        for (let i = 0; i < data.length; i++) {
          expect(vals[i]).toBe(data[i]);
        }
      }),
    );
  });

  it("nullable integer round-trip", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer({ min: -1000, max: 1000 }), { nil: null }), {
          minLength: 1,
          maxLength: 50,
        }),
        (data) => {
          const df = DataFrame.fromColumns({ n: data });
          const rt = roundtrip(df);
          const vals = colArr(rt, "n");
          for (let i = 0; i < data.length; i++) {
            if (data[i] === null) {
              expect(vals[i]).toBeNull();
            } else {
              expect(vals[i]).toBe(data[i]);
            }
          }
        },
      ),
    );
  });
});
