import { describe, expect, it } from "vitest";
import { formatCents, parseDollarsToCents } from "@/lib/money";

describe("parseDollarsToCents", () => {
  it("parses plain dollars", () => expect(parseDollarsToCents("4200")).toBe(420000));
  it("parses commas and $", () => expect(parseDollarsToCents("$4,200.50")).toBe(420050));
  it("rejects garbage", () => expect(parseDollarsToCents("abc")).toBeNull());
  it("rejects negatives", () => expect(parseDollarsToCents("-5")).toBeNull());
  it("rejects three decimals", () => expect(parseDollarsToCents("1.234")).toBeNull());
});

describe("formatCents", () => {
  it("formats with grouping", () => expect(formatCents(420000)).toBe("$4,200.00"));
  it("formats zero", () => expect(formatCents(0)).toBe("$0.00"));
});
