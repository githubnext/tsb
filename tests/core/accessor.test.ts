/**
 * Tests for accessor registration API.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import {
  DataFrame,
  Series,
  clearAccessorRegistry,
  deregisterDataFrameAccessor,
  deregisterSeriesAccessor,
  getDataFrameAccessor,
  getSeriesAccessor,
  listDataFrameAccessors,
  listSeriesAccessors,
  registerDataFrameAccessor,
  registerSeriesAccessor,
} from "../../src/index.ts";

describe("accessor registration", () => {
  beforeEach(() => {
    clearAccessorRegistry();
  });

  describe("registerSeriesAccessor", () => {
    it("registers and retrieves a series accessor", () => {
      registerSeriesAccessor("test_geo", (s) => ({ label: s.name }));
      const s = new Series({ data: [1, 2, 3], name: "my_series" });
      const acc = getSeriesAccessor<{ label: string | null }>("test_geo", s);
      expect(acc.label).toBe("my_series");
    });

    it("throws when registering duplicate name", () => {
      registerSeriesAccessor("dup", () => ({}));
      expect(() => registerSeriesAccessor("dup", () => ({}))).toThrow("already registered");
    });

    it("throws when retrieving unregistered accessor", () => {
      expect(() => getSeriesAccessor("nope", new Series({ data: [] }))).toThrow(
        "No Series accessor registered",
      );
    });

    it("deregisters a series accessor", () => {
      registerSeriesAccessor("temp", () => ({}));
      deregisterSeriesAccessor("temp");
      expect(() => getSeriesAccessor("temp", new Series({ data: [] }))).toThrow();
    });
  });

  describe("registerDataFrameAccessor", () => {
    it("registers and retrieves a dataframe accessor", () => {
      registerDataFrameAccessor("shape_acc", (df) => ({ rows: df.shape[0] }));
      const df = DataFrame.fromColumns({ a: [1, 2, 3] });
      const acc = getDataFrameAccessor<{ rows: number }>("shape_acc", df);
      expect(acc.rows).toBe(3);
    });

    it("lists registered DataFrame accessors", () => {
      registerDataFrameAccessor("acc1", () => ({}));
      registerDataFrameAccessor("acc2", () => ({}));
      const names = listDataFrameAccessors();
      expect(names).toContain("acc1");
      expect(names).toContain("acc2");
    });

    it("deregisters a DataFrame accessor", () => {
      registerDataFrameAccessor("tmp_df", () => ({}));
      deregisterDataFrameAccessor("tmp_df");
      expect(listDataFrameAccessors()).not.toContain("tmp_df");
    });
  });

  describe("listSeriesAccessors", () => {
    it("returns empty list when no accessors registered", () => {
      expect(listSeriesAccessors()).toEqual([]);
    });

    it("includes registered accessor names", () => {
      registerSeriesAccessor("my_acc", () => ({}));
      expect(listSeriesAccessors()).toContain("my_acc");
    });
  });
});
