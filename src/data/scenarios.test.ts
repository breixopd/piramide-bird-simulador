import { describe, expect, it } from "vitest";

import {
  OUTCOMES,
  QUESTION_TEMPLATE_IDS,
  SCENARIO_SECTORS,
  scenarios,
  selectScenarioQuestion,
} from "./scenarios";

describe("scenario bank", () => {
  it("contains 86 scenarios with unique IDs", () => {
    expect(scenarios).toHaveLength(86);
    expect(new Set(scenarios.map(({ id }) => id)).size).toBe(86);
  });

  it("contains distinct narratives rather than repeated placeholders", () => {
    expect(new Set(scenarios.map(({ narrative }) => narrative)).size).toBe(scenarios.length);
  });

  it("keeps broad coverage for every outcome", () => {
    for (const outcome of OUTCOMES) {
      expect(
        scenarios.filter((scenario) => scenario.outcome === outcome).length,
      ).toBeGreaterThanOrEqual(16);
    }
  });

  it("keeps at least two scenarios for every outcome and sector pair", () => {
    for (const outcome of OUTCOMES) {
      for (const sector of SCENARIO_SECTORS) {
        expect(
          scenarios.filter((scenario) => scenario.outcome === outcome && scenario.sector === sector)
            .length,
          `${outcome} / ${sector}`,
        ).toBeGreaterThanOrEqual(2);
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
          "questionBank",
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
      expect(scenario.questionBank).toEqual(QUESTION_TEMPLATE_IDS);
    }
  });

  it("selects exactly one stable question with one unambiguous correct answer", () => {
    for (const scenario of scenarios) {
      const first = selectScenarioQuestion(scenario, "run-42");
      const repeated = selectScenarioQuestion(scenario, "run-42");

      expect(repeated).toEqual(first);
      expect(first.options).toHaveLength(3);
      expect(first.options.filter(({ correct }) => correct)).toHaveLength(1);
      expect(new Set(first.options.map(({ label }) => label)).size).toBe(3);
      expect(first.prompt.trim()).not.toBe("");
      expect(first.instruction.trim()).not.toBe("");
    }
  });

  it("uses the complete question bank across different rolls", () => {
    const scenario = scenarios[0]!;
    const selected = new Set(
      Array.from(
        { length: 200 },
        (_, index) => selectScenarioQuestion(scenario, `run-${index}`).id,
      ),
    );

    expect(selected).toEqual(new Set(QUESTION_TEMPLATE_IDS));
  });

  it("includes traceable scenarios inspired by official prevention cases", () => {
    const sourced = scenarios.filter(({ sourceTags }) =>
      sourceTags.some((tag) => tag.startsWith("INSST BINVAC")),
    );

    expect(sourced).toHaveLength(6);
  });
});
