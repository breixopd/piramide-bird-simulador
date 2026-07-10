import { describe, expect, it } from "vitest";

import { evaluateChallenge } from "./challenge";

describe("statistical challenge", () => {
  it("awards the top band within ten percent of 444", () => {
    expect(evaluateChallenge(444).band).toBe("excellent");
    expect(evaluateChallenge(400).band).toBe("excellent");
    expect(evaluateChallenge(488).band).toBe("excellent");
  });

  it("awards the intermediate band within twenty-five percent", () => {
    expect(evaluateChallenge(350).band).toBe("close");
    expect(evaluateChallenge(550).band).toBe("close");
  });

  it("rejects invalid guesses and explains distant estimates", () => {
    expect(evaluateChallenge(200).band).toBe("learning");
    expect(() => evaluateChallenge(0)).toThrow(/entero positivo/i);
  });
});
