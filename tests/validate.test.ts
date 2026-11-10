import { describe, expect, it } from "vitest";
import { validate, ValidationRule } from "../src/public/types/ValidationRule";

type Sample = { n: number };

const rules: ValidationRule<Sample>[] = [
  { check: (s) => s.n > 0, message: "n must be positive" },
  { check: (s) => s.n < 10, message: "n must be below 10" },
];

describe("validate", () => {
  it("passes when every rule holds", () => {
    expect(validate({ n: 5 }, rules)).toEqual({ valid: true });
  });

  it("returns the message of the first failing rule", () => {
    expect(validate({ n: 0 }, rules)).toEqual({
      valid: false,
      message: "n must be positive",
    });
    expect(validate({ n: 10 }, rules)).toEqual({
      valid: false,
      message: "n must be below 10",
    });
  });

  it("passes with no rules", () => {
    expect(validate({ n: -1 }, [])).toEqual({ valid: true });
  });
});
