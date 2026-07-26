import { Preferences } from "@capacitor/preferences";

import { INITIAL_PROGRESS, normalizeProgress, type ProgressState } from "../domain/progress";

export interface KeyValueProgressPort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

const PROGRESS_KEY = "bird-pyramid.progress";
export const capacitorProgressAdapter: KeyValueProgressPort = {
  async get(key) {
    return (await Preferences.get({ key })).value;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
};

export async function loadProgress(
  storage: KeyValueProgressPort = capacitorProgressAdapter,
): Promise<ProgressState> {
  const raw = await storage.get(PROGRESS_KEY);
  if (raw === null) return { ...INITIAL_PROGRESS };
  try {
    const parsed: unknown = JSON.parse(raw);
    return normalizeProgress(parsed) ?? { ...INITIAL_PROGRESS };
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
