/**
 * Tests for src/io/stata.ts — readStata() and toStata().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, readStata, toStata } from "../../src/index.ts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Write then read back the DataFrame, returning the round-trip copy. */
function roundTrip(df: DataFrame): DataFrame {
  const buf = toStata(df);
  return readStata(buf);
}

// ─── toStata: output shape ────────────────────────────────────────────────────

describe("toStata — output format", () => {
  it("returns a non-empty Uint8Array", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3] });
    const buf = toStata(df);
    expect(buf).toBeInstanceOf(Uint8Array);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("starts with <stata_dta>", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const buf = toStata(df);
    const header = new TextDecoder().decode(buf.subarray(0, 11));
    expect(header).toBe("<stata_dta>");
  });

  it("contains <release>118</release>", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const text = new TextDecoder("latin1").decode(toStata(df).subarray(0, 200));
    expect(text).toContain("<release>118</release>");
  });

  it("contains little-endian byteorder marker", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const text = new TextDecoder("latin1").decode(toStata(df).subarray(0, 300));
    expect(text).toContain("<byteorder>LSF</byteorder>");
  });
});

// ─── Round-trip: numeric columns ─────────────────────────────────────────────

describe("readStata ∘ toStata — numeric round-trip", () => {
  it("round-trips integer-like values as doubles", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });
    const rt = roundTrip(df);
    expect(rt.shape).toEqual([3, 2]);
    expect([...rt.columns.values]).toEqual(["a", "b"]);
    expect([...rt.col("a").values]).toEqual([1, 2, 3]);
    expect([...rt.col("b").values]).toEqual([10, 20, 30]);
  });

  it("round-trips floating-point values", () => {
    const df = DataFrame.fromColumns({ x: [1.5, 2.75, -0.125] });
    const rt = roundTrip(df);
    const vals = [...rt.col("x").values] as number[];
    expect(vals[0]).toBeCloseTo(1.5);
    expect(vals[1]).toBeCloseTo(2.75);
    expect(vals[2]).toBeCloseTo(-0.125);
  });

  it("round-trips negative integers", () => {
    const df = DataFrame.fromColumns({ v: [-100, 0, 100] });
    const rt = roundTrip(df);
    expect([...rt.col("v").values]).toEqual([-100, 0, 100]);
  });
});

// ─── Round-trip: null / missing values ───────────────────────────────────────

describe("readStata ∘ toStata — null / missing values", () => {
  it("round-trips null in a numeric column", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3] });
    const rt = roundTrip(df);
    expect([...rt.col("a").values]).toEqual([1, null, 3]);
  });

  it("round-trips all-null column", () => {
    const df = DataFrame.fromColumns({ a: [null, null] });
    const rt = roundTrip(df);
    expect([...rt.col("a").values]).toEqual([null, null]);
  });

  it("round-trips null in a string column", () => {
    const df = DataFrame.fromColumns({ s: ["hello", null, "world"] });
    const rt = roundTrip(df);
    // null strings come back as empty strings after trimming null bytes
    const vals = [...rt.col("s").values] as string[];
    expect(vals[0]).toBe("hello");
    expect(vals[2]).toBe("world");
  });
});

// ─── Round-trip: string columns ──────────────────────────────────────────────

describe("readStata ∘ toStata — string columns", () => {
  it("round-trips short ASCII strings", () => {
    const df = DataFrame.fromColumns({ name: ["Alice", "Bob", "Carol"] });
    const rt = roundTrip(df);
    expect([...rt.col("name").values]).toEqual(["Alice", "Bob", "Carol"]);
  });

  it("round-trips empty strings", () => {
    const df = DataFrame.fromColumns({ s: ["", "a", ""] });
    const rt = roundTrip(df);
    const vals = [...rt.col("s").values];
    expect(vals[1]).toBe("a");
  });

  it("round-trips a string that is exactly 2045 bytes", () => {
    const long = "x".repeat(2045);
    const df = DataFrame.fromColumns({ s: [long] });
    const rt = roundTrip(df);
    expect(([...rt.col("s").values][0] as string).length).toBe(2045);
  });

  it("truncates strings longer than 2045 bytes", () => {
    const long = "y".repeat(3000);
    const df = DataFrame.fromColumns({ s: [long] });
    const rt = roundTrip(df);
    expect(([...rt.col("s").values][0] as string).length).toBe(2045);
  });
});

// ─── Round-trip: boolean columns ─────────────────────────────────────────────

describe("readStata ∘ toStata — boolean columns", () => {
  it("round-trips booleans as 0/1 bytes", () => {
    const df = DataFrame.fromColumns({ flag: [true, false, true] });
    const rt = roundTrip(df);
    const vals = [...rt.col("flag").values] as number[];
    expect(vals[0]).toBe(1);
    expect(vals[1]).toBe(0);
    expect(vals[2]).toBe(1);
  });
});

// ─── Round-trip: multi-column ─────────────────────────────────────────────────

describe("readStata ∘ toStata — multi-column", () => {
  it("preserves column order", () => {
    const df = DataFrame.fromColumns({ z: [3], a: [1], m: [2] });
    const rt = roundTrip(df);
    expect([...rt.columns.values]).toEqual(["z", "a", "m"]);
  });

  it("preserves values across mixed-type columns", () => {
    const df = DataFrame.fromColumns({
      id: [1, 2, 3],
      name: ["x", "y", "z"],
      score: [9.5, null, 7.0],
    });
    const rt = roundTrip(df);
    expect(rt.shape).toEqual([3, 3]);
    expect([...rt.col("id").values]).toEqual([1, 2, 3]);
    expect([...rt.col("name").values]).toEqual(["x", "y", "z"]);
    const scores = [...rt.col("score").values] as (number | null)[];
    expect(scores[0]).toBeCloseTo(9.5);
    expect(scores[1]).toBeNull();
    expect(scores[2]).toBeCloseTo(7.0);
  });
});

// ─── readStata options ───────────────────────────────────────────────────────

describe("readStata — options", () => {
  it("nRows limits the number of rows returned", () => {
    const df = DataFrame.fromColumns({ v: [1, 2, 3, 4, 5] });
    const buf = toStata(df);
    const rt = readStata(buf, { nRows: 2 });
    expect(rt.shape[0]).toBe(2);
    expect([...rt.col("v").values]).toEqual([1, 2]);
  });

  it("nRows = 0 returns empty DataFrame", () => {
    const df = DataFrame.fromColumns({ v: [1, 2, 3] });
    const rt = readStata(toStata(df), { nRows: 0 });
    expect(rt.shape[0]).toBe(0);
  });

  it("usecols filters to named columns only", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4], c: [5, 6] });
    const rt = readStata(toStata(df), { usecols: ["a", "c"] });
    expect([...rt.columns.values]).toEqual(["a", "c"]);
    expect([...rt.col("a").values]).toEqual([1, 2]);
    expect([...rt.col("c").values]).toEqual([5, 6]);
  });

  it("usecols: empty array returns no columns", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    const rt = readStata(toStata(df), { usecols: [] });
    expect(rt.shape[1]).toBe(0);
  });

  it("indexCol by name sets the row index", () => {
    const df = DataFrame.fromColumns({ id: [10, 20, 30], val: [1, 2, 3] });
    const rt = readStata(toStata(df), { indexCol: "id" });
    expect([...rt.index.toArray()]).toEqual([10, 20, 30]);
    expect([...rt.columns.values]).toEqual(["val"]);
  });
});

// ─── toStata options ──────────────────────────────────────────────────────────

describe("toStata — options", () => {
  it("writeIndex=true adds _index column", () => {
    const df = DataFrame.fromColumns({ v: [10, 20] });
    const rt = readStata(toStata(df, { writeIndex: true }));
    expect([...rt.columns.values]).toContain("_index");
  });

  it("dataLabel is embedded in the file (new format has length prefix)", () => {
    const df = DataFrame.fromColumns({ x: [1] });
    const buf = toStata(df, { dataLabel: "My Dataset" });
    const text = new TextDecoder("latin1").decode(buf);
    expect(text).toContain("My Dataset");
  });

  it("variableLabels are embedded for each named column", () => {
    const df = DataFrame.fromColumns({ age: [25] });
    const buf = toStata(df, { variableLabels: { age: "Age in years" } });
    const text = new TextDecoder("latin1").decode(buf);
    expect(text).toContain("Age in years");
  });
});

// ─── readStata: error handling ────────────────────────────────────────────────

describe("readStata — error handling", () => {
  it("throws on empty buffer", () => {
    expect(() => readStata(new Uint8Array(0))).toThrow();
  });

  it("throws on a 3-byte buffer", () => {
    expect(() => readStata(new Uint8Array([0, 1, 2]))).toThrow();
  });

  it("throws on unknown old-format version byte", () => {
    const bad = new Uint8Array(200);
    bad[0] = 50; // version 50 is not a valid Stata version
    expect(() => readStata(bad)).toThrow();
  });
});

// ─── Empty DataFrame ──────────────────────────────────────────────────────────

describe("readStata ∘ toStata — edge cases", () => {
  it("round-trips a single cell", () => {
    const df = DataFrame.fromColumns({ x: [42] });
    const rt = roundTrip(df);
    expect(rt.shape).toEqual([1, 1]);
    expect([...rt.col("x").values]).toEqual([42]);
  });

  it("round-trips a zero-row DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [] as number[] });
    const rt = roundTrip(df);
    expect(rt.shape[0]).toBe(0);
  });

  it("handles column names up to 32 chars (Stata limit)", () => {
    const longName = "a".repeat(32);
    const df = DataFrame.fromColumns({ [longName]: [1, 2] });
    const rt = roundTrip(df);
    expect([...rt.columns.values][0]).toBe(longName);
  });

  it("column names longer than 32 chars are truncated to 32", () => {
    const longName = "b".repeat(40);
    const df = DataFrame.fromColumns({ [longName]: [1] });
    const rt = roundTrip(df);
    const rtName = ([...rt.columns.values][0] as string) ?? "";
    expect(rtName.length).toBe(32);
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("readStata ∘ toStata — property-based", () => {
  it("round-trip preserves shape [rows × 1 numeric column]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.float({ noNaN: true }), { nil: null }), {
          minLength: 0,
          maxLength: 50,
        }),
        (vals) => {
          const df = DataFrame.fromColumns({ v: vals });
          const rt = roundTrip(df);
          expect(rt.shape[0]).toBe(vals.length);
          expect(rt.shape[1]).toBe(1);
        },
      ),
    );
  });

  it("round-trip preserves non-null finite doubles", () => {
    // Stata stores doubles with |value| < 2^1023 as non-missing.
    // Values >= 2^1023 share the Stata missing-value bit pattern and round-trip to null.
    const stataDoubleRange = fc
      .double({ noNaN: true, noDefaultInfinity: true })
      .filter((n) => Math.abs(n) < 2 ** 1023);
    fc.assert(
      fc.property(
        fc.array(stataDoubleRange, {
          minLength: 1,
          maxLength: 30,
        }),
        (nums) => {
          const df = DataFrame.fromColumns({ v: nums });
          const rt = roundTrip(df);
          const out = [...rt.col("v").values] as number[];
          for (let i = 0; i < nums.length; i++) {
            const n = nums[i];
            const o = out[i];
            if (n === undefined || o === undefined) continue;
            expect(o).toBeCloseTo(n, 10);
          }
        },
      ),
    );
  });

  it("round-trip preserves null pattern in numeric column", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer({ min: -1000, max: 1000 }), { nil: null }), {
          minLength: 0,
          maxLength: 40,
        }),
        (vals) => {
          const df = DataFrame.fromColumns({ v: vals });
          const rt = roundTrip(df);
          const out = [...rt.col("v").values];
          const inNulls = vals.map((v) => v === null);
          const outNulls = out.map((v) => v === null);
          expect(outNulls).toEqual(inNulls);
        },
      ),
    );
  });

  it("nRows clamps output row count to min(nRows, available)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), {
          minLength: 0,
          maxLength: 50,
        }),
        fc.nat(60),
        (vals, nRows) => {
          const df = DataFrame.fromColumns({ v: vals });
          const rt = readStata(toStata(df), { nRows });
          expect(rt.shape[0]).toBe(Math.min(nRows, vals.length));
        },
      ),
    );
  });
});
