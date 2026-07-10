import { describe, expect, it } from "vitest";

import { INITIAL_PROGRESS, updateProgress } from "./progress";

describe("progress and achievements", () => {
  it("unlocks the first simulation and bulk achievements", () => {
    const next = updateProgress(INITIAL_PROGRESS, {
      modelId: "bird-classic",
      sequence: Array.from({ length: 1000 }, () => "near-miss" as const),
      convergenceScore: 0.5,
      totalBeforeRun: 0,
    });
    expect(next.unlocked).toContain("first-simulation");
    expect(next.unlocked).toContain("bulk-runner");
    expect(next.unlocked).toContain("near-miss-streak-50");
    expect(next.currentNearMissStreak).toBe(1000);
  });

  it("unlocks the hard lesson only for a fatality in the extended model", () => {
    const next = updateProgress(INITIAL_PROGRESS, {
      modelId: "didactic-extended",
      sequence: ["fatality"],
      convergenceScore: 0,
      totalBeforeRun: 0,
    });
    expect(next.unlocked).toContain("hard-lesson");

    const classicFatality = updateProgress(INITIAL_PROGRESS, {
      modelId: "bird-classic",
      sequence: ["fatality"],
      convergenceScore: 0,
      totalBeforeRun: 0,
    });
    const extendedNearMiss = updateProgress(INITIAL_PROGRESS, {
      modelId: "didactic-extended",
      sequence: ["near-miss"],
      convergenceScore: 0,
      totalBeforeRun: 0,
    });
    expect(classicFatality.unlocked).not.toContain("hard-lesson");
    expect(extendedNearMiss.unlocked).not.toContain("hard-lesson");
  });

  it("requires at least 1000 total outcomes for convergence mastery", () => {
    const tooSoon = updateProgress(INITIAL_PROGRESS, {
      modelId: "bird-classic",
      sequence: ["near-miss"],
      convergenceScore: 0.99,
      totalBeforeRun: 998,
    });
    const enough = updateProgress(INITIAL_PROGRESS, {
      modelId: "bird-classic",
      sequence: ["near-miss"],
      convergenceScore: 0.98,
      totalBeforeRun: 999,
    });
    expect(tooSoon.unlocked).not.toContain("convergence-master");
    expect(enough.unlocked).toContain("convergence-master");
  });
});
