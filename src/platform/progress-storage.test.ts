import { describe, expect, it } from "vitest";

import { INITIAL_PROGRESS } from "../domain/progress";
import { loadProgress, saveProgress, type KeyValueProgressPort } from "./progress-storage";

function memoryPort(
  initial: string | null = null,
): KeyValueProgressPort & { value: string | null } {
  return {
    value: initial,
    async get() {
      return this.value;
    },
    async set(_key, value) {
      this.value = value;
    },
  };
}

describe("achievement persistence", () => {
  it("uses safe defaults for missing or malformed progress", async () => {
    await expect(loadProgress(memoryPort())).resolves.toEqual(INITIAL_PROGRESS);
    await expect(loadProgress(memoryPort("broken"))).resolves.toEqual(INITIAL_PROGRESS);
  });

  it("round-trips unlocked achievements and streaks", async () => {
    const port = memoryPort();
    const progress = {
      ...INITIAL_PROGRESS,
      unlocked: ["first-simulation", "bulk-runner"] as const,
      currentNearMissStreak: 4,
      bestNearMissStreak: 72,
    };
    await saveProgress(progress, port);
    await expect(loadProgress(port)).resolves.toEqual(progress);
  });

  it("migrates progress saved before question metrics were introduced", async () => {
    const legacy = JSON.stringify({
      unlocked: ["first-simulation"],
      currentNearMissStreak: 2,
      bestNearMissStreak: 8,
    });

    await expect(loadProgress(memoryPort(legacy))).resolves.toEqual({
      ...INITIAL_PROGRESS,
      unlocked: ["first-simulation"],
      currentNearMissStreak: 2,
      bestNearMissStreak: 8,
    });
  });
});
