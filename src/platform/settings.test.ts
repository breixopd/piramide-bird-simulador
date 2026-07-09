import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  loadSettings,
  saveSettings,
  type KeyValuePort,
  type SettingsState,
} from "./settings";

class MemoryKeyValuePort implements KeyValuePort {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

describe("settings persistence", () => {
  it("returns privacy-preserving defaults when no settings have been saved", async () => {
    const storage = new MemoryKeyValuePort();

    await expect(loadSettings(storage)).resolves.toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({
      version: 1,
      theme: "system",
      reducedMotion: false,
      haptics: true,
      shakeToReset: true,
      analyticsConsent: "unknown",
      onboardingComplete: false,
      extendedContentAcknowledged: false,
    });
  });

  it("round-trips a complete version 1 settings document", async () => {
    const storage = new MemoryKeyValuePort();
    const settings: SettingsState = {
      version: 1,
      theme: "dark",
      reducedMotion: true,
      haptics: false,
      shakeToReset: false,
      analyticsConsent: "granted",
      onboardingComplete: true,
      extendedContentAcknowledged: true,
    };

    await saveSettings(settings, storage);

    await expect(loadSettings(storage)).resolves.toEqual(settings);
  });

  it.each([
    "not-json",
    JSON.stringify({ version: 2, theme: "dark" }),
    JSON.stringify({ ...DEFAULT_SETTINGS, theme: "neon" }),
    JSON.stringify({ ...DEFAULT_SETTINGS, analyticsConsent: true }),
  ])("falls back safely for malformed or unsupported data: %s", async (storedValue) => {
    const storage = new MemoryKeyValuePort();
    await storage.set(SETTINGS_STORAGE_KEY, storedValue);

    await expect(loadSettings(storage)).resolves.toEqual(DEFAULT_SETTINGS);
  });
});
