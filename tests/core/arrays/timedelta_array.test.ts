/**
 * Tests for TimedeltaArray — nullable array of Timedeltas.
 */

import { describe, expect, it } from "bun:test";
import { Timedelta } from "../../../src/core/timedelta.ts";
import { TimedeltaArray } from "../../../src/core/arrays/timedelta_array.ts";

const td1 = Timedelta.fromComponents({ days: 1 });
const td2 = Timedelta.fromComponents({ hours: 6 });
const td3 = Timedelta.fromComponents({ days: 2, hours: 12 });

describe("TimedeltaArray", () => {
  describe("from()", () => {
    it("creates from Timedelta objects", () => {
      const a = TimedeltaArray.from([td1, null, td2]);
      expect(a.size).toBe(3);
      expect(a.at(0)?.totalMilliseconds).toBe(td1.totalMilliseconds);
      expect(a.at(1)).toBeNull();
    });

    it("creates from millisecond numbers", () => {
      const a = TimedeltaArray.from([86400000, null]);
      expect(a.at(0)?.totalMilliseconds).toBe(86400000);
      expect(a.at(1)).toBeNull();
    });

    it("creates from ISO duration strings", () => {
      const a = TimedeltaArray.from(["P1D", null]);
      expect(a.at(0)?.days).toBe(1);
      expect(a.at(1)).toBeNull();
    });

    it("handles null and undefined as NA", () => {
      const a = TimedeltaArray.from([td1, null, undefined, td2]);
      expect(a.isna()).toEqual([false, true, true, false]);
    });
  });

  describe("dtype", () => {
    it("returns timedelta64[ns]", () => {
      const a = TimedeltaArray.from([td1]);
      expect(a.dtype).toBe("timedelta64[ns]");
    });
  });

  describe("at()", () => {
    it("returns element by index", () => {
      const a = TimedeltaArray.from([td1, null, td2]);
      expect(a.at(0)?.totalMilliseconds).toBe(td1.totalMilliseconds);
      expect(a.at(-1)?.totalMilliseconds).toBe(td2.totalMilliseconds);
    });

    it("returns null for masked positions", () => {
      expect(TimedeltaArray.from([td1, null]).at(1)).toBeNull();
    });
  });

  describe("isna / notna", () => {
    it("isna()", () => {
      expect(TimedeltaArray.from([td1, null]).isna()).toEqual([false, true]);
    });

    it("notna()", () => {
      expect(TimedeltaArray.from([td1, null]).notna()).toEqual([true, false]);
    });
  });

  describe("component accessors", () => {
    it("days", () => {
      const a = TimedeltaArray.from([td1, null, td3]);
      expect(a.days).toEqual([1, null, 2]);
    });

    it("hours", () => {
      const a = TimedeltaArray.from([td2, null]);
      expect(a.hours[0]).toBe(6);
    });

    it("totalMilliseconds", () => {
      const a = TimedeltaArray.from([td1, null]);
      expect(a.totalMilliseconds[0]).toBe(86_400_000);
    });

    it("totalSeconds", () => {
      const a = TimedeltaArray.from([td1, null]);
      expect(a.totalSeconds[0]).toBe(86_400);
    });

    it("totalHours", () => {
      const a = TimedeltaArray.from([td1, null]);
      expect(a.totalHours[0]).toBe(24);
    });

    it("totalDays", () => {
      const a = TimedeltaArray.from([td1, null]);
      expect(a.totalDays[0]).toBe(1);
    });
  });

  describe("arithmetic", () => {
    it("add scalar Timedelta", () => {
      const a = TimedeltaArray.from([td1, null]);
      const extra = Timedelta.fromComponents({ hours: 1 });
      const result = a.add(extra).toArray();
      expect(result[0]?.totalMilliseconds).toBe(td1.totalMilliseconds + extra.totalMilliseconds);
      expect(result[1]).toBeNull();
    });

    it("add two arrays, NA propagates", () => {
      const a = TimedeltaArray.from([td1, null]);
      const b = TimedeltaArray.from([td2, td2]);
      const result = a.add(b).toArray();
      expect(result[0]?.totalMilliseconds).toBe(td1.totalMilliseconds + td2.totalMilliseconds);
      expect(result[1]).toBeNull();
    });

    it("sub scalar Timedelta", () => {
      const a = TimedeltaArray.from([td3, null]);
      const result = a.sub(td1).toArray();
      expect(result[0]?.totalMilliseconds).toBe(td3.totalMilliseconds - td1.totalMilliseconds);
    });

    it("mul by scalar", () => {
      const a = TimedeltaArray.from([td2, null]);
      const result = a.mul(2).toArray();
      expect(result[0]?.totalMilliseconds).toBe(td2.totalMilliseconds * 2);
      expect(result[1]).toBeNull();
    });

    it("throws on size mismatch", () => {
      const a = TimedeltaArray.from([td1, td2]);
      const b = TimedeltaArray.from([td1]);
      expect(() => a.add(b)).toThrow();
    });
  });

  describe("reductions", () => {
    it("sum", () => {
      const a = TimedeltaArray.from([td1, null, td2]);
      const s = a.sum();
      expect(s?.totalMilliseconds).toBe(td1.totalMilliseconds + td2.totalMilliseconds);
    });

    it("sum returns null for all-NA with skipna=false", () => {
      expect(TimedeltaArray.from([null]).sum(false)).toBeNull();
    });

    it("min", () => {
      const a = TimedeltaArray.from([td3, null, td1]);
      expect(a.min()?.totalMilliseconds).toBe(td1.totalMilliseconds);
    });

    it("max", () => {
      const a = TimedeltaArray.from([td3, null, td1]);
      expect(a.max()?.totalMilliseconds).toBe(td3.totalMilliseconds);
    });
  });

  describe("toArray()", () => {
    it("returns array with null for NA", () => {
      const a = TimedeltaArray.from([td1, null]);
      const arr = a.toArray();
      expect(arr[0]?.totalMilliseconds).toBe(td1.totalMilliseconds);
      expect(arr[1]).toBeNull();
    });
  });

  describe("fillna()", () => {
    it("fills NA with a Timedelta", () => {
      const fill = Timedelta.fromMilliseconds(0);
      const a = TimedeltaArray.from([td1, null]);
      expect(a.fillna(fill).at(1)?.totalMilliseconds).toBe(0);
    });
  });

  describe("iteration", () => {
    it("iterates over elements", () => {
      const a = TimedeltaArray.from([td1, null, td2]);
      const result = [...a];
      expect(result[0]?.totalMilliseconds).toBe(td1.totalMilliseconds);
      expect(result[1]).toBeNull();
      expect(result[2]?.totalMilliseconds).toBe(td2.totalMilliseconds);
    });
  });

  describe("toString()", () => {
    it("renders dtype and <NA>", () => {
      const s = TimedeltaArray.from([td1, null]).toString();
      expect(s).toContain("timedelta64");
      expect(s).toContain("<NA>");
    });
  });
});
