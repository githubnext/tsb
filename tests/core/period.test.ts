/**
 * Tests for Period and PeriodIndex.
 */
import { describe, expect, it } from "bun:test";
import { Period, PeriodIndex, periodRange } from "../../src/index.ts";

describe("Period", () => {
  describe("fromDate / toString", () => {
    it("creates monthly period", () => {
      const p = Period.fromDate(new Date("2024-03-15T00:00:00.000Z"), "M");
      expect(p.toString()).toBe("2024-03");
      expect(p.freq).toBe("M");
    });

    it("creates annual period", () => {
      const p = Period.fromDate(new Date("2023-07-01T00:00:00.000Z"), "A");
      expect(p.toString()).toBe("2023");
    });

    it("'Y' is alias for 'A'", () => {
      const p = Period.fromDate(new Date("2023-07-01T00:00:00.000Z"), "Y");
      expect(p.freq).toBe("A");
      expect(p.toString()).toBe("2023");
    });

    it("creates quarterly period", () => {
      const p = Period.fromDate(new Date("2024-05-01T00:00:00.000Z"), "Q");
      expect(p.toString()).toBe("2024Q2");
    });

    it("creates daily period", () => {
      const p = Period.fromDate(new Date("2024-03-15T00:00:00.000Z"), "D");
      expect(p.toString()).toBe("2024-03-15");
    });
  });

  describe("startDate / endDate", () => {
    it("monthly period spans correct days", () => {
      const p = Period.fromDate(new Date("2024-02-15T00:00:00.000Z"), "M");
      expect(p.startDate.getUTCMonth()).toBe(1); // February = 1
      expect(p.startDate.getUTCDate()).toBe(1);
      expect(p.endDate.getUTCMonth()).toBe(1);
      expect(p.endDate.getUTCDate()).toBe(29); // 2024 is a leap year
    });

    it("annual period starts Jan 1", () => {
      const p = Period.fromDate(new Date("2024-06-15T00:00:00.000Z"), "A");
      expect(p.startDate.getUTCMonth()).toBe(0);
      expect(p.startDate.getUTCDate()).toBe(1);
    });
  });

  describe("shift", () => {
    it("shifts monthly period forward", () => {
      const p = Period.fromDate(new Date("2024-01-01T00:00:00.000Z"), "M");
      const next = p.shift(3);
      expect(next.toString()).toBe("2024-04");
    });

    it("shifts backward with negative n", () => {
      const p = Period.fromDate(new Date("2024-03-01T00:00:00.000Z"), "M");
      expect(p.shift(-2).toString()).toBe("2024-01");
    });
  });

  describe("equals / compareTo", () => {
    it("equal periods return true", () => {
      const p1 = Period.fromDate(new Date("2024-03-15T00:00:00.000Z"), "M");
      const p2 = Period.fromDate(new Date("2024-03-01T00:00:00.000Z"), "M");
      expect(p1.equals(p2)).toBe(true);
    });

    it("different periods return false", () => {
      const p1 = Period.fromDate(new Date("2024-03-15T00:00:00.000Z"), "M");
      const p2 = Period.fromDate(new Date("2024-04-01T00:00:00.000Z"), "M");
      expect(p1.equals(p2)).toBe(false);
    });

    it("compareTo returns negative for earlier period", () => {
      const p1 = Period.fromDate(new Date("2024-01-01T00:00:00.000Z"), "M");
      const p2 = Period.fromDate(new Date("2024-03-01T00:00:00.000Z"), "M");
      expect(p1.compareTo(p2)).toBeLessThan(0);
    });

    it("compareTo throws for different frequencies", () => {
      const p1 = Period.fromDate(new Date("2024-01-01T00:00:00.000Z"), "M");
      const p2 = Period.fromDate(new Date("2024-01-01T00:00:00.000Z"), "D");
      expect(() => p1.compareTo(p2)).toThrow();
    });
  });

  describe("parse", () => {
    it("parses valid date string", () => {
      const p = Period.parse("2024-05", "M");
      expect(p.toString()).toBe("2024-05");
    });

    it("throws on invalid date string", () => {
      expect(() => Period.parse("not-a-date", "M")).toThrow(TypeError);
    });
  });
});

describe("PeriodIndex", () => {
  describe("range", () => {
    it("creates n monthly periods from start date", () => {
      const pi = PeriodIndex.range(new Date("2024-01-01T00:00:00.000Z"), 4, "M");
      expect(pi.length).toBe(4);
      expect(pi.iloc(0).toString()).toBe("2024-01");
      expect(pi.iloc(3).toString()).toBe("2024-04");
    });
  });

  describe("fromPeriods", () => {
    it("creates index from period array", () => {
      const periods = [
        Period.fromDate(new Date("2024-01-01T00:00:00.000Z"), "M"),
        Period.fromDate(new Date("2024-02-01T00:00:00.000Z"), "M"),
      ];
      const pi = PeriodIndex.fromPeriods(periods);
      expect(pi.length).toBe(2);
      expect(pi.freq).toBe("M");
    });

    it("creates empty index", () => {
      const pi = PeriodIndex.fromPeriods([]);
      expect(pi.length).toBe(0);
    });

    it("throws when frequencies differ", () => {
      const periods = [
        Period.fromDate(new Date("2024-01-01T00:00:00.000Z"), "M"),
        Period.fromDate(new Date("2024-01-01T00:00:00.000Z"), "D"),
      ];
      expect(() => PeriodIndex.fromPeriods(periods)).toThrow();
    });
  });

  describe("shift", () => {
    it("shifts all periods", () => {
      const pi = PeriodIndex.range(new Date("2024-01-01T00:00:00.000Z"), 3, "M");
      const shifted = pi.shift(2);
      expect(shifted.iloc(0).toString()).toBe("2024-03");
      expect(shifted.iloc(2).toString()).toBe("2024-05");
    });
  });

  describe("startTimes / endTimes", () => {
    it("returns array of start dates", () => {
      const pi = PeriodIndex.range(new Date("2024-01-01T00:00:00.000Z"), 3, "M");
      const starts = pi.startTimes();
      expect(starts).toHaveLength(3);
      expect(starts[0]?.getUTCMonth()).toBe(0);
    });
  });
});

describe("periodRange", () => {
  it("generates inclusive range of monthly periods", () => {
    const pi = periodRange(
      new Date("2024-01-01T00:00:00.000Z"),
      new Date("2024-03-01T00:00:00.000Z"),
      "M",
    );
    expect(pi.length).toBe(3);
    expect(pi.iloc(0).toString()).toBe("2024-01");
    expect(pi.iloc(2).toString()).toBe("2024-03");
  });

  it("returns empty index when end < start", () => {
    const pi = periodRange(
      new Date("2024-03-01T00:00:00.000Z"),
      new Date("2024-01-01T00:00:00.000Z"),
      "M",
    );
    expect(pi.length).toBe(0);
  });
});
