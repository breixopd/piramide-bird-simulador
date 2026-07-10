import { Preferences } from "@capacitor/preferences";

export type ThemePreference = "light" | "dark" | "system";
export type AnalyticsConsent = "unknown" | "granted" | "denied";

export interface SettingsState {
  readonly version: 1;
  readonly theme: ThemePreference;
  readonly reducedMotion: boolean;
  readonly haptics: boolean;
  readonly shakeToReset: boolean;
  readonly analyticsConsent: AnalyticsConsent;
  readonly extendedContentAcknowledged: boolean;
}

export interface KeyValuePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export const SETTINGS_STORAGE_KEY = "bird-pyramid.settings";
export const ANALYTICS_CONSENT_STORAGE_KEY = "bird-pyramid.analytics-consent";

export const DEFAULT_SETTINGS: Readonly<SettingsState> = Object.freeze({
  version: 1,
  theme: "dark",
  reducedMotion: false,
  haptics: true,
  shakeToReset: true,
  analyticsConsent: "unknown",
  extendedContentAcknowledged: false,
});

export const capacitorPreferencesAdapter: KeyValuePort = {
  async get(key) {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
};

let settingsSaveQueue: Promise<void> = Promise.resolve();

function isSettingsState(value: unknown): value is SettingsState {
  if (typeof value !== "object" || value === null) return false;

  const settings = value as Record<string, unknown>;
  return (
    settings.version === 1 &&
    (settings.theme === "light" || settings.theme === "dark" || settings.theme === "system") &&
    typeof settings.reducedMotion === "boolean" &&
    typeof settings.haptics === "boolean" &&
    typeof settings.shakeToReset === "boolean" &&
    (settings.analyticsConsent === "unknown" ||
      settings.analyticsConsent === "granted" ||
      settings.analyticsConsent === "denied") &&
    typeof settings.extendedContentAcknowledged === "boolean"
  );
}

export async function loadSettings(
  storage: KeyValuePort = capacitorPreferencesAdapter,
): Promise<SettingsState> {
  const storedValue = await storage.get(SETTINGS_STORAGE_KEY);
  const storedConsent = await storage.get(ANALYTICS_CONSENT_STORAGE_KEY);
  let settings: SettingsState = { ...DEFAULT_SETTINGS };

  if (storedValue !== null) {
    try {
      const parsed: unknown = JSON.parse(storedValue);
      if (isSettingsState(parsed)) settings = parsed;
    } catch {
      // Keep privacy-preserving defaults for malformed settings.
    }
  }

  if (storedConsent === "unknown" || storedConsent === "granted" || storedConsent === "denied") {
    settings = { ...settings, analyticsConsent: storedConsent };
  } else if (storedConsent !== null) {
    settings = { ...settings, analyticsConsent: "unknown" };
  }

  return settings;
}

async function persistSettings(settings: SettingsState, storage: KeyValuePort): Promise<void> {
  const preCommitConsent =
    settings.analyticsConsent === "granted" ? "denied" : settings.analyticsConsent;
  await storage.set(ANALYTICS_CONSENT_STORAGE_KEY, preCommitConsent);
  await storage.set(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  if (settings.analyticsConsent === "granted") {
    await storage.set(ANALYTICS_CONSENT_STORAGE_KEY, "granted");
  }
}

export async function saveSettings(
  settings: SettingsState,
  storage: KeyValuePort = capacitorPreferencesAdapter,
): Promise<void> {
  const queuedSave = settingsSaveQueue.then(() => persistSettings(settings, storage));
  settingsSaveQueue = queuedSave.catch(() => undefined);
  await queuedSave;
}
