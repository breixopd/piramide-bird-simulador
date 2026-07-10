import { Preferences } from "@capacitor/preferences";

import {
  ACHIEVEMENTS,
  INITIAL_PROGRESS,
  type AchievementId,
  type ProgressState,
} from "../domain/progress";

export interface KeyValueProgressPort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

const PROGRESS_KEY = "bird-pyramid.progress";
const achievementIds = new Set<AchievementId>(ACHIEVEMENTS.map(({ id }) => id));

export const capacitorProgressAdapter: KeyValueProgressPort = {
  async get(key) {
    return (await Preferences.get({ key })).value;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
};

function isProgressState(value: unknown): value is ProgressState {
  if (typeof value !== "object" || value === null) return false;
  const progress = value as Record<string, unknown>;
  return (
    Array.isArray(progress.unlocked) &&
    progress.unlocked.every((id) => achievementIds.has(id as AchievementId)) &&
    Number.isSafeInteger(progress.currentNearMissStreak) &&
    Number(progress.currentNearMissStreak) >= 0 &&
    Number.isSafeInteger(progress.bestNearMissStreak) &&
    Number(progress.bestNearMissStreak) >= Number(progress.currentNearMissStreak)
  );
}

export async function loadProgress(
  storage: KeyValueProgressPort = capacitorProgressAdapter,
): Promise<ProgressState> {
  const raw = await storage.get(PROGRESS_KEY);
  if (raw === null) return { ...INITIAL_PROGRESS };
  try {
    const parsed: unknown = JSON.parse(raw);
    return isProgressState(parsed) ? parsed : { ...INITIAL_PROGRESS };
  } catch {
    return { ...INITIAL_PROGRESS };
  }
}

export async function saveProgress(
  progress: ProgressState,
  storage: KeyValueProgressPort = capacitorProgressAdapter,
): Promise<void> {
  await storage.set(PROGRESS_KEY, JSON.stringify(progress));
}
