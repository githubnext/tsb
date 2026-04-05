/**
 * Tests for src/core/option.ts
 */

import { describe, expect, test, beforeEach } from "bun:test";
import fc from "fast-check";
import {
  getOption,
  setOption,
  resetOption,
  resetAllOptions,
  describeOption,
  listOptions,
  registerOption,
  OptionError,
} from "../../src/index.ts";

// Reset all options before each test for isolation
beforeEach(() => {
  resetAllOptions();
});

// ─── basic get/set/reset ─────────────────────────────────────────────────────

describe("getOption", () => {
  test("returns default value initially", () => {
    expect(getOption("display.max_rows")).toBe(60);
    expect(getOption("display.max_columns")).toBe(20);
    expect(getOption("display.precision")).toBe(6);
    expect(getOption("display.na_rep")).toBe("NaN");
    expect(getOption("display.float_format")).toBe(null);
    expect(getOption("display.show_dimensions")).toBe(true);
  });

  test("throws OptionError for unknown key", () => {
    expect(() => getOption("does.not.exist")).toThrow(OptionError);
  });
});

describe("setOption", () => {
  test("updates the value", () => {
    setOption("display.max_rows", 100);
    expect(getOption("display.max_rows")).toBe(100);
  });

  test("throws OptionError for unknown key", () => {
    expect(() => setOption("does.not.exist", 42)).toThrow(OptionError);
  });

  test("throws TypeError for invalid value", () => {
    expect(() => setOption("display.max_rows", -1)).toThrow(TypeError);
    expect(() => setOption("display.max_rows", 1.5)).toThrow(TypeError);
    expect(() => setOption("display.max_rows", "big")).toThrow(TypeError);
  });

  test("sets na_rep to string", () => {
    setOption("display.na_rep", "NA");
    expect(getOption("display.na_rep")).toBe("NA");
  });

  test("sets float_format to null", () => {
    setOption("display.float_format", null);
    expect(getOption("display.float_format")).toBeNull();
  });

  test("validates mode.chained_assignment", () => {
    setOption("mode.chained_assignment", "raise");
    expect(getOption("mode.chained_assignment")).toBe("raise");
    setOption("mode.chained_assignment", "none");
    expect(getOption("mode.chained_assignment")).toBe("none");
    expect(() => setOption("mode.chained_assignment", "invalid")).toThrow(TypeError);
  });
});

describe("resetOption", () => {
  test("restores default after set", () => {
    setOption("display.max_rows", 999);
    resetOption("display.max_rows");
    expect(getOption("display.max_rows")).toBe(60);
  });

  test("throws OptionError for unknown key", () => {
    expect(() => resetOption("does.not.exist")).toThrow(OptionError);
  });
});

describe("resetAllOptions", () => {
  test("resets everything", () => {
    setOption("display.max_rows", 200);
    setOption("display.precision", 10);
    resetAllOptions();
    expect(getOption("display.max_rows")).toBe(60);
    expect(getOption("display.precision")).toBe(6);
  });
});

// ─── describeOption ──────────────────────────────────────────────────────────

describe("describeOption", () => {
  test("returns description string", () => {
    const desc = describeOption("display.max_rows");
    expect(desc).toContain("display.max_rows");
    expect(desc).toContain("60"); // default
  });

  test("shows current value when set", () => {
    setOption("display.max_rows", 200);
    const desc = describeOption("display.max_rows");
    expect(desc).toContain("200");
  });

  test("throws for unknown key", () => {
    expect(() => describeOption("not.real")).toThrow(OptionError);
  });
});

// ─── listOptions ─────────────────────────────────────────────────────────────

describe("listOptions", () => {
  test("returns array of option keys", () => {
    const keys = listOptions();
    expect(Array.isArray(keys)).toBe(true);
    expect(keys).toContain("display.max_rows");
    expect(keys).toContain("display.precision");
    expect(keys).toContain("mode.chained_assignment");
  });
});

// ─── registerOption ──────────────────────────────────────────────────────────

describe("registerOption", () => {
  test("registers and gets custom option", () => {
    // Use a unique key to avoid collision with other tests
    const key = `test_option_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    registerOption(key, {
      description: "A test option",
      defaultValue: 42,
      validator: (v) => {
        if (typeof v !== "number") throw new TypeError("Expected number");
      },
    });
    expect(getOption(key)).toBe(42);
    setOption(key, 99);
    expect(getOption(key)).toBe(99);
  });

  test("throws if key already registered", () => {
    expect(() =>
      registerOption("display.max_rows", {
        description: "duplicate",
        defaultValue: 0,
        validator: () => undefined,
      }),
    ).toThrow();
  });
});

// ─── property-based ──────────────────────────────────────────────────────────

describe("option property tests", () => {
  test("set then get returns same value for valid values", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        (n) => {
          setOption("display.max_rows", n);
          const got = getOption("display.max_rows");
          resetOption("display.max_rows");
          return got === n;
        },
      ),
    );
  });

  test("reset after set always returns default", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        (n) => {
          setOption("display.max_columns", n);
          resetOption("display.max_columns");
          return getOption("display.max_columns") === 20;
        },
      ),
    );
  });
});
