import { afterEach, describe, expect, it } from "vitest";

import type { AppState } from "../app-controller";
import { INITIAL_PROGRESS } from "../domain/progress";
import { DEFAULT_SETTINGS } from "../platform/settings";
import { emptyModelTotals } from "../platform/totals-storage";
import type { AchievementsView } from "./achievements-view";
import "./achievements-view";

afterEach(() => document.body.replaceChildren());

describe("achievements view learning progress", () => {
  it("shows progress towards question-based achievements", async () => {
    const view = document.createElement("achievements-view") as AchievementsView;
    view.state = {
      initialized: true,
      activeModelId: "bird-classic",
      settings: DEFAULT_SETTINGS,
      progress: {
        ...INITIAL_PROGRESS,
        questionsAnswered: 4,
        correctAnswers: 3,
        currentCorrectStreak: 3,
        bestCorrectStreak: 3,
        answeredScenarioIds: ["one", "two", "three", "four"],
        unlocked: ["hazard-spotter"],
      },
      history: [],
      totals: emptyModelTotals(),
      selectedScenario: null,
      latestRun: null,
      running: false,
      persistenceDegraded: false,
    } satisfies AppState;
    document.body.append(view);
    await view.updateComplete;

    const text = view.textContent?.replace(/\s+/g, " ");
    expect(text).toContain("Detector de peligros");
    expect(text).toContain("Racha preventiva");
    expect(text).toContain("3 de 5");
    expect(text).toContain("Explorador de casos");
    expect(text).toContain("4 de 10");
  });
});
