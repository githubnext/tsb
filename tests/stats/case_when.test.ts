/**
 * Tests for src/stats/case_when.ts
 * Covers caseWhen — conditional value selection using CASE WHEN semantics.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series, caseWhen } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[]): Series<Scalar> {
  return new Series({ data: [...data] });
}

function boolS(data: readonly boolean[]): Series<boolean> {
  return new Series<boolean>({ data: [...data] });
}

// ─── basic functionality ──────────────────────────────────────────────────────

describe("caseWhen — basic", () => {
  it("empty caselist returns copy of original", () => {
    const ser = s([1, 2, 3]);
    const res = caseWhen(ser, []);
    expect(res.toArray()).toEqual([1, 2, 3]);
  });

  it("single branch — scalar replacement", () => {
    const ser = s([1, 2, 3, 4]);
    const cond = boolS([true, false, true, false]);
    const res = caseWhen(ser, [[cond, 99]]);
    expect(res.toArray()).toEqual([99, 2, 99, 4]);
  });

  it("single branch — Series replacement", () => {
    const ser = s([1, 2, 3]);
    const cond = boolS([true, false, true]);
    const repl = s([10, 20, 30]);
    const res = caseWhen(ser, [[cond, repl]]);
    expect(res.toArray()).toEqual([10, 2, 30]);
  });

  it("single branch — array replacement", () => {
    const ser = s([1, 2, 3]);
    const cond = boolS([false, true, true]);
    const res = caseWhen(ser, [[cond, [100, 200, 300]]]);
    expect(res.toArray()).toEqual([1, 200, 300]);
  });

  it("first matching condition wins", () => {
    const ser = s([1, 2, 3, 4, 5]);
    const lt3 = boolS([true, true, false, false, false]);
    const lt5 = boolS([true, true, true, true, false]);
    const res = caseWhen(ser, [
      [lt3, "small"],
      [lt5, "medium"],
    ]);
    expect(res.toArray()).toEqual(["small", "small", "medium", "medium", 5]);
  });

  it("grade classification — pandas docs example style", () => {
    const score = new Series<number>({ data: [45, 72, 88, 95, 60] });
    const d = score.toArray();
    const ge90 = boolS(d.map(v => v >= 90));
    const ge75 = boolS(d.map(v => v >= 75));
    const ge60 = boolS(d.map(v => v >= 60));
    const ge45 = boolS(d.map(v => v >= 45));
    const grade = caseWhen(score, [
      [ge90, "A"],
      [ge75, "B"],
      [ge60, "C"],
      [ge45, "D"],
    ]);
    expect(grade.toArray()).toEqual(["D", "C", "B", "A", "C"]);
  });

  it("predicate function condition", () => {
    const ser = s([10, 20, 30, 40]);
    const res = caseWhen(ser, [
      [(v) => (v as number) > 25, "big"],
    ]);
    expect(res.toArray()).toEqual([10, 20, "big", "big"]);
  });

  it("predicate receives positional index as second arg", () => {
    const ser = s([1, 2, 3, 4]);
    const indices: number[] = [];
    caseWhen(ser, [[(_v, i) => { indices.push(i); return false; }, 0]]);
    expect(indices).toEqual([0, 1, 2, 3]);
  });

  it("boolean array condition", () => {
    const ser = s(["a", "b", "c", "d"]);
    const res = caseWhen(ser, [[[true, false, false, true], "X"]]);
    expect(res.toArray()).toEqual(["X", "b", "c", "X"]);
  });

  it("no condition matches — original value preserved", () => {
    const ser = s([1, 2, 3]);
    const allFalse = boolS([false, false, false]);
    const res = caseWhen(ser, [[allFalse, 99]]);
    expect(res.toArray()).toEqual([1, 2, 3]);
  });

  it("null original value preserved when no condition matches", () => {
    const ser = s([null, 2, null]);
    const allFalse = boolS([false, false, false]);
    const res = caseWhen(ser, [[allFalse, 0]]);
    expect(res.toArray()).toEqual([null, 2, null]);
  });

  it("handles null in replacement Series", () => {
    const ser = s([1, 2, 3]);
    const cond = boolS([true, true, true]);
    const repl = s([null, null, null]);
    const res = caseWhen(ser, [[cond, repl]]);
    expect(res.toArray()).toEqual([null, null, null]);
  });

  it("preserves index from source series", () => {
    const ser = new Series<Scalar>({ data: [1, 2, 3], index: ["a", "b", "c"] });
    const cond = boolS([true, false, true]);
    const res = caseWhen(ser, [[cond, 0]]);
    expect(res.index.toArray()).toEqual(["a", "b", "c"]);
  });

  it("all conditions true — first replacement always wins", () => {
    const ser = s([1, 2, 3]);
    const allTrue = boolS([true, true, true]);
    const res = caseWhen(ser, [
      [allTrue, "first"],
      [allTrue, "second"],
    ]);
    expect(res.toArray()).toEqual(["first", "first", "first"]);
  });

  it("mixed types in replacements", () => {
    const ser = s([1, 2, 3, 4]);
    const cond1 = boolS([true, false, false, false]);
    const cond2 = boolS([false, true, false, false]);
    const res = caseWhen(ser, [
      [cond1, "text"],
      [cond2, 42.5],
    ]);
    expect(res.toArray()).toEqual(["text", 42.5, 3, 4]);
  });

  it("boolean Series condition with mismatched true values", () => {
    const ser = s([10, 20, 30]);
    const cond = boolS([false, true, false]);
    const res = caseWhen(ser, [[cond, -1]]);
    expect(res.toArray()).toEqual([10, -1, 30]);
  });

  it("three branches cover all rows", () => {
    const ser = new Series<number>({ data: [1, 5, 10, 15, 20] });
    const d = ser.toArray();
    const lt5 = boolS(d.map(v => v < 5));
    const lt10 = boolS(d.map(v => v < 10));
    const lt20 = boolS(d.map(v => v < 20));
    const res = caseWhen(ser, [
      [lt5, "low"],
      [lt10, "mid"],
      [lt20, "high"],
    ]);
    expect(res.toArray()).toEqual(["low", "mid", "mid", "high", 20]);
  });
});

// ─── edge cases ──────────────────────────────────────────────────────────────

describe("caseWhen — edge cases", () => {
  it("single element series", () => {
    const ser = s([42]);
    const res = caseWhen(ser, [[boolS([true]), "replaced"]]);
    expect(res.toArray()).toEqual(["replaced"]);
  });

  it("empty series", () => {
    const ser = s([]);
    const res = caseWhen(ser, [[boolS([]), 0]]);
    expect(res.toArray()).toEqual([]);
    expect(res.length).toBe(0);
  });

  it("string series — text classification", () => {
    const ser = s(["apple", "banana", "cherry", "date"]);
    const res = caseWhen(ser, [
      [(v) => (v as string).length > 5, "long"],
      [(v) => (v as string).length > 4, "medium"],
    ]);
    expect(res.toArray()).toEqual(["medium", "long", "long", "date"]);
  });

  it("boolean values in series", () => {
    const ser = new Series<boolean>({ data: [true, false, true] });
    const cond = boolS([true, true, false]);
    const res = caseWhen(ser, [[cond, null]]);
    expect(res.toArray()).toEqual([null, null, true]);
  });

  it("replacement array shorter than series uses null for missing", () => {
    // When replacement array is shorter, missing positions yield null
    const ser = s([1, 2, 3]);
    const cond = boolS([false, false, true]);
    const res = caseWhen(ser, [[cond, [10, 20]]]);
    // index 2 is true, replacement[2] is undefined → null
    expect(res.toArray()).toEqual([1, 2, null]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("caseWhen — property tests", () => {
  it("length is always preserved", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 0, maxLength: 20 }),
        (data) => {
          const ser = new Series<number>({ data: [...data] });
          const cond = boolS(data.map(v => v > 0));
          const res = caseWhen(ser, [[cond, 999]]);
          return res.length === data.length;
        },
      ),
    );
  });

  it("empty caselist is identity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.constant(null)), { minLength: 0, maxLength: 20 }),
        (data) => {
          const ser = s(data);
          const res = caseWhen(ser, []);
          const orig = ser.toArray();
          const got = res.toArray();
          for (let i = 0; i < orig.length; i++) {
            if (orig[i] !== got[i]) return false;
          }
          return true;
        },
      ),
    );
  });

  it("all-true condition replaces all values with scalar", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 20 }),
        fc.integer(),
        (data, scalar) => {
          const ser = new Series<number>({ data: [...data] });
          const allTrue = boolS(data.map(() => true));
          const res = caseWhen(ser, [[allTrue, scalar]]);
          return res.toArray().every(v => v === scalar);
        },
      ),
    );
  });

  it("all-false condition keeps original values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 20 }),
        (data) => {
          const ser = new Series<number>({ data: [...data] });
          const allFalse = boolS(data.map(() => false));
          const res = caseWhen(ser, [[allFalse, 999]]);
          const orig = ser.toArray();
          const got = res.toArray();
          for (let i = 0; i < orig.length; i++) {
            if (orig[i] !== got[i]) return false;
          }
          return true;
        },
      ),
    );
  });

  it("index is preserved", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 15 }),
        (data) => {
          const index = data.map((_, i) => `key_${i}`);
          const ser = new Series<number>({ data: [...data], index: [...index] });
          const cond = boolS(data.map(v => v > 0));
          const res = caseWhen(ser, [[cond, 0]]);
          return JSON.stringify(res.index.toArray()) === JSON.stringify(index);
        },
      ),
    );
  });

  it("predicate condition equivalent to boolean array", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -50, max: 50 }), { minLength: 1, maxLength: 20 }),
        (data) => {
          const ser = new Series<number>({ data: [...data] });
          const bools = data.map(v => v > 0);
          const res1 = caseWhen(ser, [[boolS(bools), -1]]);
          const res2 = caseWhen(ser, [[(v) => (v as number) > 0, -1]]);
          const a1 = res1.toArray();
          const a2 = res2.toArray();
          for (let i = 0; i < a1.length; i++) {
            if (a1[i] !== a2[i]) return false;
          }
          return true;
        },
      ),
    );
  });
});
