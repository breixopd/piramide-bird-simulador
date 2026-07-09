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
  readonly onboardingComplete: boolean;
  readonly extendedContentAcknowledged: boolean;
}

export interface KeyValuePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export const SETTINGS_STORAGE_KEY = "bird-pyramid.settings";

export const DEFAULT_SETTINGS: Readonly<SettingsState> = Object.freeze({
  version: 1,
  theme: "system",
  reducedMotion: false,
  haptics: true,
  shakeToReset: true,
  analyticsConsent: "unknown",
  onboardingComplete: false,
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
    typeof settings.onboardingComplete === "boolean" &&
    typeof settings.extendedContentAcknowledged === "boolean"
  );
}

export async function loadSettings(
  storage: KeyValuePort = capacitorPreferencesAdapter,
): Promise<SettingsState> {
  const storedValue = await storage.get(SETTINGS_STORAGE_KEY);
  if (storedValue === null) return { ...DEFAULT_SETTINGS };

  try {
    const parsed: unknown = JSON.parse(storedValue);
    return isSettingsState(parsed) ? parsed : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(
  settings: SettingsState,
  storage: KeyValuePort = capacitorPreferencesAdapter,
): Promise<void> {
  await storage.set(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
