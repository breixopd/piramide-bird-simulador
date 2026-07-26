import { describe, expect, it } from "vitest";

import { INITIAL_PROGRESS, updateLearningProgress, updateProgress } from "./progress";

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

  it("tracks question accuracy, streaks and explored scenarios", () => {
    let progress = updateLearningProgress(INITIAL_PROGRESS, {
      scenarioId: "construction-near-miss-1",
      correct: true,
    });
    progress = updateLearningProgress(progress, {
      scenarioId: "construction-near-miss-2",
      correct: false,
    });

    expect(progress.questionsAnswered).toBe(2);
    expect(progress.correctAnswers).toBe(1);
    expect(progress.currentCorrectStreak).toBe(0);
    expect(progress.bestCorrectStreak).toBe(1);
    expect(progress.answeredScenarioIds).toEqual([
      "construction-near-miss-1",
      "construction-near-miss-2",
    ]);
    expect(progress.unlocked).toContain("hazard-spotter");
  });

  it("unlocks question achievements for five correct answers in a row and ten scenarios", () => {
    let progress = INITIAL_PROGRESS;
    for (let index = 0; index < 10; index += 1) {
      progress = updateLearningProgress(progress, {
        scenarioId: `scenario-${index}`,
        correct: index < 5,
      });
    }

    expect(progress.unlocked).toContain("hazard-streak-5");
    expect(progress.unlocked).toContain("scenario-explorer-10");
    expect(progress.bestCorrectStreak).toBe(5);
    expect(progress.answeredScenarioIds).toHaveLength(10);
  });
});
