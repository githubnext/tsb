import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { readXml } from "../../src/index.ts";

describe("readXml", () => {
  it("parses simple child-element rows", () => {
    const xml = `<root>
      <row><a>1</a><b>foo</b></row>
      <row><a>2</a><b>bar</b></row>
    </root>`;
    const df = readXml(xml);
    expect(df.columns.values).toEqual(["a", "b"]);
    expect(df.col("a").values).toEqual([1, 2]);
    expect(df.col("b").values).toEqual(["foo", "bar"]);
  });

  it("auto-detects row tag from most-repeated child", () => {
    const xml = `<catalog>
      <book><title>A</title></book>
      <book><title>B</title></book>
      <meta><info>x</info></meta>
    </catalog>`;
    const df = readXml(xml);
    expect(df.index.size).toBe(2);
    expect(df.col("title").values).toEqual(["A", "B"]);
  });

  it("supports //tagName xpath", () => {
    const xml = `<root>
      <group>
        <item><x>1</x></item>
        <item><x>2</x></item>
      </group>
    </root>`;
    const df = readXml(xml, { xpath: "//item" });
    expect(df.col("x").values).toEqual([1, 2]);
  });

  it("supports /root/child xpath", () => {
    const xml = `<root>
      <row><v>10</v></row>
      <row><v>20</v></row>
    </root>`;
    const df = readXml(xml, { xpath: "/root/row" });
    expect(df.col("v").values).toEqual([10, 20]);
  });

  it("parses attributes", () => {
    const xml = `<root>
      <item id="1" name="Alice"/>
      <item id="2" name="Bob"/>
    </root>`;
    const df = readXml(xml);
    expect(df.col("id").values).toEqual([1, 2]);
    expect(df.col("name").values).toEqual(["Alice", "Bob"]);
  });

  it("respects elemsOnly (ignores attributes)", () => {
    const xml = `<root>
      <row id="1"><v>42</v></row>
      <row id="2"><v>99</v></row>
    </root>`;
    const df = readXml(xml, { elemsOnly: true });
    expect(df.columns.values).toEqual(["v"]);
  });

  it("respects attrsOnly (ignores child elements)", () => {
    const xml = `<root>
      <row id="1"><v>42</v></row>
      <row id="2"><v>99</v></row>
    </root>`;
    const df = readXml(xml, { attrsOnly: true });
    expect(df.columns.values).toEqual(["id"]);
    expect(df.col("id").values).toEqual([1, 2]);
  });

  it("applies NA detection", () => {
    const xml = `<root>
      <row><val>1</val></row>
      <row><val>NA</val></row>
      <row><val>None</val></row>
    </root>`;
    const df = readXml(xml);
    expect(df.col("val").values).toEqual([1, null, null]);
  });

  it("respects custom naValues", () => {
    const xml = `<root>
      <row><val>MISSING</val></row>
      <row><val>3</val></row>
    </root>`;
    const df = readXml(xml, { naValues: ["MISSING"] });
    expect(df.col("val").values).toEqual([null, 3]);
  });

  it("respects custom names option", () => {
    const xml = `<root>
      <row><a>1</a><b>2</b></row>
    </root>`;
    const df = readXml(xml, { names: ["x", "y"] });
    expect(df.columns.values).toEqual(["x", "y"]);
    expect(df.col("x").values).toEqual([1]);
  });

  it("handles XML with declaration", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <!-- comment -->
    <root><row><n>5</n></row></root>`;
    const df = readXml(xml);
    expect(df.col("n").values).toEqual([5]);
  });

  it("returns empty DataFrame for empty input", () => {
    const df = readXml("<root></root>");
    expect(df.index.size).toBe(0);
  });

  it("returns empty DataFrame for non-XML garbage", () => {
    const df = readXml("not xml at all");
    expect(df.index.size).toBe(0);
  });

  it("handles single-quoted attributes", () => {
    const xml = `<root>
      <row id='10' name='Carol'/>
    </root>`;
    const df = readXml(xml);
    expect(df.col("id").values).toEqual([10]);
    expect(df.col("name").values).toEqual(["Carol"]);
  });

  it("infers numeric columns", () => {
    const xml = `<data>
      <r><n>3.14</n><s>hello</s></r>
      <r><n>2.71</n><s>world</s></r>
    </data>`;
    const df = readXml(xml);
    expect(typeof df.col("n").values[0]).toBe("number");
    expect(typeof df.col("s").values[0]).toBe("string");
  });

  // Property-based test
  it("property: always returns a DataFrame with consistent shape", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            a: fc.integer({ min: 0, max: 100 }),
            b: fc.string({ maxLength: 5 }).filter((s) => !s.includes("<") && !s.includes(">")),
          }),
          { minLength: 0, maxLength: 10 },
        ),
        (rows) => {
          const xml = `<root>${rows.map((r) => `<row><a>${r.a}</a><b>${r.b}</b></row>`).join("")}</root>`;
          const df = readXml(xml);
          if (rows.length === 0) {
            expect(df.index.size).toBe(0);
          } else {
            expect(df.index.size).toBe(rows.length);
            expect(df.columns.values.length).toBeGreaterThan(0);
          }
        },
      ),
    );
  });
});
