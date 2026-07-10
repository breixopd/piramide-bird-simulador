import { describe, expect, it } from "vitest";

import {
  ANALYTICS_CONSENT_STORAGE_KEY,
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
      theme: "dark",
      reducedMotion: false,
      haptics: true,
      shakeToReset: true,
      analyticsConsent: "unknown",
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
      extendedContentAcknowledged: true,
    };

    await saveSettings(settings, storage);

    await expect(loadSettings(storage)).resolves.toEqual(settings);
  });

  it("keeps denied consent after the general settings write fails", async () => {
    const previouslyGranted: SettingsState = {
      ...DEFAULT_SETTINGS,
      analyticsConsent: "granted",
    };
    const values = new Map([[SETTINGS_STORAGE_KEY, JSON.stringify(previouslyGranted)]]);
    const storage: KeyValuePort = {
      async get(key) {
        return values.get(key) ?? null;
      },
      async set(key, value) {
        if (key === SETTINGS_STORAGE_KEY) throw new Error("General settings unavailable");
        values.set(key, value);
      },
    };

    await expect(
      saveSettings({ ...previouslyGranted, analyticsConsent: "denied" }, storage),
    ).rejects.toThrow("General settings unavailable");

    await expect(loadSettings(storage)).resolves.toMatchObject({ analyticsConsent: "denied" });
  });

  it("does not persist a grant when the general settings write fails", async () => {
    const previouslyDenied: SettingsState = {
      ...DEFAULT_SETTINGS,
      analyticsConsent: "denied",
    };
    const values = new Map([[SETTINGS_STORAGE_KEY, JSON.stringify(previouslyDenied)]]);
    const storage: KeyValuePort = {
      async get(key) {
        return values.get(key) ?? null;
      },
      async set(key, value) {
        if (key === SETTINGS_STORAGE_KEY) throw new Error("General settings unavailable");
        values.set(key, value);
      },
    };

    await expect(
      saveSettings({ ...previouslyDenied, analyticsConsent: "granted" }, storage),
    ).rejects.toThrow("General settings unavailable");

    await expect(loadSettings(storage)).resolves.toMatchObject({ analyticsConsent: "denied" });
  });

  it("serializes concurrent saves so a later denial wins", async () => {
    const values = new Map<string, string>();
    let releaseFinalGrant: () => void = () => undefined;
    const finalGrantReleased = new Promise<void>((resolve) => {
      releaseFinalGrant = resolve;
    });
    let signalFinalGrantStarted: () => void = () => undefined;
    const finalGrantStarted = new Promise<void>((resolve) => {
      signalFinalGrantStarted = resolve;
    });
    const storage: KeyValuePort = {
      async get(key) {
        return values.get(key) ?? null;
      },
      async set(key, value) {
        if (key === ANALYTICS_CONSENT_STORAGE_KEY && value === "granted") {
          signalFinalGrantStarted();
          await finalGrantReleased;
        }
        values.set(key, value);
      },
    };

    const grantSave = saveSettings({ ...DEFAULT_SETTINGS, analyticsConsent: "granted" }, storage);
    await finalGrantStarted;
    const denialSave = saveSettings({ ...DEFAULT_SETTINGS, analyticsConsent: "denied" }, storage);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    releaseFinalGrant();
    await Promise.all([grantSave, denialSave]);

    await expect(loadSettings(storage)).resolves.toMatchObject({ analyticsConsent: "denied" });
  });

  it("keeps the denied tombstone when finalizing a grant fails", async () => {
    const values = new Map<string, string>();
    const storage: KeyValuePort = {
      async get(key) {
        return values.get(key) ?? null;
      },
      async set(key, value) {
        if (key === ANALYTICS_CONSENT_STORAGE_KEY && value === "granted") {
          throw new Error("Consent marker unavailable");
        }
        values.set(key, value);
      },
    };

    await expect(
      saveSettings({ ...DEFAULT_SETTINGS, analyticsConsent: "granted" }, storage),
    ).rejects.toThrow("Consent marker unavailable");

    await expect(loadSettings(storage)).resolves.toMatchObject({ analyticsConsent: "denied" });
  });

  it.each(["granted", "denied"] as const)(
    "loads legacy %s consent when the dedicated marker is absent",
    async (analyticsConsent) => {
      const storage = new MemoryKeyValuePort();
      await storage.set(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ ...DEFAULT_SETTINGS, analyticsConsent }),
      );

      await expect(loadSettings(storage)).resolves.toMatchObject({ analyticsConsent });
    },
  );

  it("fails closed when the dedicated consent marker is invalid", async () => {
    const storage = new MemoryKeyValuePort();
    await storage.set(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, analyticsConsent: "granted" }),
    );
    await storage.set(ANALYTICS_CONSENT_STORAGE_KEY, "invalid");

    await expect(loadSettings(storage)).resolves.toMatchObject({ analyticsConsent: "unknown" });
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
