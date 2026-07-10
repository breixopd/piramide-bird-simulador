import { describe, expect, it } from "vitest";

import { MODELS } from "./models";
import {
  calculateConvergence,
  calculateThreshold,
  pickOutcome,
  simulate,
  type RandomSource,
} from "./simulation";

const fixed =
  (value: number): RandomSource =>
  () =>
    value;

describe("weighted simulation", () => {
  const bird = MODELS["bird-classic"];

  it("selects outcomes at every weight boundary", () => {
    expect(pickOutcome(bird, fixed(0))).toBe("near-miss");
    expect(pickOutcome(bird, fixed(599.999 / 641))).toBe("near-miss");
    expect(pickOutcome(bird, fixed(600 / 641))).toBe("property-damage");
    expect(pickOutcome(bird, fixed(630 / 641))).toBe("minor-injury");
    expect(pickOutcome(bird, fixed(640 / 641))).toBe("serious-injury");
  });

  it("returns a complete deterministic batch without mixing models", () => {
    const values = [0, 600 / 641, 630 / 641, 640 / 641];
    let index = 0;
    const result = simulate(bird, 4, () => values[index++] ?? 0);

    expect(result.modelId).toBe("bird-classic");
    expect(result.sequence).toEqual([
      "near-miss",
      "property-damage",
      "minor-injury",
      "serious-injury",
    ]);
    expect(result.counts).toEqual({
      "near-miss": 1,
      "property-damage": 1,
      "minor-injury": 1,
      "serious-injury": 1,
    });
  });

  it("rejects invalid iteration counts and random values", () => {
    expect(() => simulate(bird, 0, Math.random)).toThrow(/positive integer/i);
    expect(() => pickOutcome(bird, fixed(1))).toThrow(/\[0, 1\)/);
  });
});

describe("statistical helpers", () => {
  it("returns perfect convergence for the exact theoretical distribution", () => {
    expect(
      calculateConvergence(MODELS["bird-classic"], {
        "near-miss": 600,
        "property-damage": 30,
        "minor-injury": 10,
        "serious-injury": 1,
      }),
    ).toBeCloseTo(1, 10);
  });

  it("calculates the first iteration crossing a target probability", () => {
    expect(calculateThreshold(1 / 641, 0.5)).toBe(444);
  });
});
