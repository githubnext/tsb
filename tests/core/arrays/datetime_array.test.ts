/**
 * Tests for DatetimeArray — nullable array of Timestamps.
 */

import { describe, expect, it } from "bun:test";
import { DatetimeArray } from "../../../src/core/arrays/datetime_array.ts";
import { Timestamp } from "../../../src/core/timestamp.ts";

const ts1 = new Timestamp("2024-01-15T10:00:00Z");
const ts2 = new Timestamp("2024-03-20T14:30:00Z");
const ts3 = new Timestamp("2023-12-01T00:00:00Z");

describe("DatetimeArray", () => {
  describe("from()", () => {
    it("creates from Timestamp objects", () => {
      const a = DatetimeArray.from([ts1, null, ts2]);
      expect(a.size).toBe(3);
      expect(a.at(0)?._utcMs).toBe(ts1._utcMs);
      expect(a.at(1)).toBeNull();
    });

    it("creates from ISO strings", () => {
      const a = DatetimeArray.from(["2024-01-15", null]);
      expect(a.at(0)).toBeInstanceOf(Timestamp);
      expect(a.at(1)).toBeNull();
    });

    it("creates from millisecond numbers", () => {
      const ms = 1705315200000;
      const a = DatetimeArray.from([ms, null]);
      expect(a.at(0)?._utcMs).toBe(ms);
    });

    it("creates from JS Dates", () => {
      const d = new Date("2024-01-15T10:00:00Z");
      const a = DatetimeArray.from([d, null]);
      expect(a.at(0)?._utcMs).toBe(d.getTime());
    });

    it("handles null and undefined as NA", () => {
      const a = DatetimeArray.from([ts1, null, undefined, ts2]);
      expect(a.isna()).toEqual([false, true, true, false]);
    });
  });

  describe("dtype", () => {
    it("returns datetime64[ns] for naive arrays", () => {
      const a = DatetimeArray.from([ts1]);
      expect(a.dtype).toBe("datetime64[ns]");
    });

    it("returns datetime64[ns, tz] for tz-aware arrays", () => {
      const a = DatetimeArray.from(["2024-01-01"], { tz: "UTC" });
      expect(a.dtype).toBe("datetime64[ns, UTC]");
    });
  });

  describe("at()", () => {
    it("returns element by index", () => {
      const a = DatetimeArray.from([ts1, null, ts2]);
      expect(a.at(0)?._utcMs).toBe(ts1._utcMs);
      expect(a.at(-1)?._utcMs).toBe(ts2._utcMs);
    });

    it("returns null for masked positions", () => {
      const a = DatetimeArray.from([ts1, null]);
      expect(a.at(1)).toBeNull();
    });

    it("returns null for out-of-bounds", () => {
      const a = DatetimeArray.from([ts1]);
      expect(a.at(5)).toBeNull();
    });
  });

  describe("isna / notna", () => {
    it("isna()", () => {
      const a = DatetimeArray.from([ts1, null]);
      expect(a.isna()).toEqual([false, true]);
    });

    it("notna()", () => {
      const a = DatetimeArray.from([ts1, null]);
      expect(a.notna()).toEqual([true, false]);
    });
  });

  describe("component accessors", () => {
    const a = DatetimeArray.from([ts1, null, ts2]);

    it("year", () => {
      const years = a.year;
      expect(years[0]).toBe(2024);
      expect(years[1]).toBeNull();
      expect(years[2]).toBe(2024);
    });

    it("month", () => {
      const months = a.month;
      expect(months[0]).toBe(1);
      expect(months[1]).toBeNull();
      expect(months[2]).toBe(3);
    });

    it("day", () => {
      const days = a.day;
      expect(days[0]).toBe(15);
      expect(days[1]).toBeNull();
    });

    it("hour", () => {
      const hours = a.hour;
      expect(hours[0]).toBe(10);
      expect(hours[1]).toBeNull();
    });

    it("dayofweek", () => {
      // 2024-01-15 is Monday (0)
      const dows = a.dayofweek;
      expect(dows[0]).toBe(0);
      expect(dows[1]).toBeNull();
    });

    it("quarter", () => {
      const quarters = a.quarter;
      expect(quarters[0]).toBe(1);
      expect(quarters[2]).toBe(1);
    });
  });

  describe("min() / max()", () => {
    it("min returns earliest Timestamp", () => {
      const a = DatetimeArray.from([ts1, null, ts3]);
      expect(a.min()?._utcMs).toBe(ts3._utcMs);
    });

    it("max returns latest Timestamp", () => {
      const a = DatetimeArray.from([ts1, null, ts3]);
      expect(a.max()?._utcMs).toBe(ts1._utcMs);
    });

    it("min/max return null for all-NA", () => {
      const a = DatetimeArray.from([null]);
      expect(a.min()).toBeNull();
      expect(a.max()).toBeNull();
    });
  });

  describe("toArray()", () => {
    it("returns array with null for NA", () => {
      const a = DatetimeArray.from([ts1, null]);
      const arr = a.toArray();
      expect(arr[0]?._utcMs).toBe(ts1._utcMs);
      expect(arr[1]).toBeNull();
    });
  });

  describe("asMs()", () => {
    it("returns millisecond timestamps", () => {
      const a = DatetimeArray.from([ts1, null]);
      expect(a.asMs()).toEqual([ts1._utcMs, null]);
    });
  });

  describe("fillna()", () => {
    it("fills NA with a Timestamp", () => {
      const fill = new Timestamp("2000-01-01");
      const a = DatetimeArray.from([ts1, null]);
      expect(a.fillna(fill).at(1)?._utcMs).toBe(fill._utcMs);
    });
  });

  describe("iteration", () => {
    it("iterates over elements", () => {
      const a = DatetimeArray.from([ts1, null, ts2]);
      const result = [...a];
      expect(result[0]?._utcMs).toBe(ts1._utcMs);
      expect(result[1]).toBeNull();
      expect(result[2]?._utcMs).toBe(ts2._utcMs);
    });
  });

  describe("toString()", () => {
    it("renders dtype and <NA>", () => {
      const s = DatetimeArray.from([ts1, null]).toString();
      expect(s).toContain("datetime64");
      expect(s).toContain("<NA>");
    });
  });
});
