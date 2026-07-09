import { describe, expect, it } from "vitest";

import { OUTCOMES, SCENARIO_SECTORS, scenarios } from "./scenarios";

describe("scenario bank", () => {
  it("contains exactly 80 scenarios with unique IDs", () => {
    expect(scenarios).toHaveLength(80);
    expect(new Set(scenarios.map(({ id }) => id)).size).toBe(80);
  });

  it("contains 80 distinct narratives rather than repeated placeholders", () => {
    expect(new Set(scenarios.map(({ narrative }) => narrative)).size).toBe(80);
  });

  it("contains 16 scenarios for every outcome", () => {
    for (const outcome of OUTCOMES) {
      expect(scenarios.filter((scenario) => scenario.outcome === outcome)).toHaveLength(16);
    }
  });

  it("contains exactly two scenarios for every outcome and sector pair", () => {
    for (const outcome of OUTCOMES) {
      for (const sector of SCENARIO_SECTORS) {
        expect(
          scenarios.filter(
            (scenario) => scenario.outcome === outcome && scenario.sector === sector,
          ),
          `${outcome} / ${sector}`,
        ).toHaveLength(2);
      }
    }
  });

  it("uses only the supported outcomes and sectors", () => {
    expect(new Set(scenarios.map(({ outcome }) => outcome))).toEqual(new Set(OUTCOMES));
    expect(new Set(scenarios.map(({ sector }) => sector))).toEqual(new Set(SCENARIO_SECTORS));
  });

  it("provides complete educational content for every scenario", () => {
    for (const scenario of scenarios) {
      expect(Object.keys(scenario).sort()).toEqual(
        [
          "consequence",
          "hazard",
          "id",
          "immediateCause",
          "narrative",
          "outcome",
          "preventiveActions",
          "sector",
          "sourceTags",
        ].sort(),
      );
      expect(scenario.id.trim()).not.toBe("");
      expect(scenario.narrative.trim()).not.toBe("");
      expect(scenario.hazard.trim()).not.toBe("");
      expect(scenario.immediateCause.trim()).not.toBe("");
      expect(scenario.consequence.trim()).not.toBe("");
      expect(scenario.preventiveActions).toHaveLength(2);
      expect(scenario.preventiveActions.every((action) => action.trim() !== "")).toBe(true);
      expect(scenario.sourceTags.length).toBeGreaterThan(0);
      expect(scenario.sourceTags.every((tag) => tag.trim() !== "")).toBe(true);
    }
  });
});
