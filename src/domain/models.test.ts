import { describe, expect, it } from "vitest";

import { MODELS } from "./models";

describe("simulation models", () => {
  it("defines the historical Bird 600:30:10:1 model", () => {
    expect(MODELS["bird-classic"].outcomes.map(({ id, weight }) => [id, weight])).toEqual([
      ["near-miss", 600],
      ["property-damage", 30],
      ["minor-injury", 10],
      ["serious-injury", 1],
    ]);
  });

  it("labels the fatality model as a didactic adaptation", () => {
    const model = MODELS["didactic-extended"];
    expect(model.educationalDisclaimer).toMatch(/adaptación didáctica/i);
    expect(model.outcomes.map(({ id, weight }) => [id, weight])).toEqual([
      ["near-miss", 600],
      ["minor-injury", 30],
      ["serious-injury", 10],
      ["fatality", 1],
    ]);
  });
});
