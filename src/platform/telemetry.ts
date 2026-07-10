import { ConsentStatus, ConsentType, FirebaseAnalytics } from "@capacitor-firebase/analytics";
import { FirebaseCrashlytics } from "@capacitor-firebase/crashlytics";

import type { AnalyticsConsent } from "./settings";

export type TelemetryValue = string | number | boolean;
export type TelemetryParams = Readonly<Record<string, TelemetryValue>>;

export interface AnalyticsPort {
  setConsent(status: "granted" | "denied"): Promise<void>;
  setEnabled(enabled: boolean): Promise<void>;
  resetAnalyticsData(): Promise<void>;
  logEvent(name: string, params: TelemetryParams): Promise<void>;
}

export interface CrashlyticsPort {
  setEnabled(enabled: boolean): Promise<void>;
  deleteUnsentReports(): Promise<void>;
  recordException(message: string): Promise<void>;
}

export interface TelemetryService {
  applyConsent(
    consent: Exclude<AnalyticsConsent, "unknown">,
  ): Promise<{ restartRequired: boolean }>;
  log(name: string, params?: TelemetryParams): Promise<void>;
  recordError(error: unknown): Promise<void>;
}

export const firebaseAnalyticsPort: AnalyticsPort = {
  async setConsent(status) {
    await FirebaseAnalytics.setConsent({
      type: ConsentType.AnalyticsStorage,
      status: status === "granted" ? ConsentStatus.Granted : ConsentStatus.Denied,
    });
  },
  async setEnabled(enabled) {
    await FirebaseAnalytics.setEnabled({ enabled });
  },
  async resetAnalyticsData() {
    await FirebaseAnalytics.resetAnalyticsData();
  },
  async logEvent(name, params) {
    await FirebaseAnalytics.logEvent({ name, params: { ...params } });
  },
};

export const firebaseCrashlyticsPort: CrashlyticsPort = {
  async setEnabled(enabled) {
    await FirebaseCrashlytics.setEnabled({ enabled });
  },
  async deleteUnsentReports() {
    await FirebaseCrashlytics.deleteUnsentReports();
  },
  async recordException(message) {
    await FirebaseCrashlytics.recordException({ message });
  },
};

export function createTelemetryService(
  analytics: AnalyticsPort = firebaseAnalyticsPort,
  crashlytics: CrashlyticsPort = firebaseCrashlyticsPort,
): TelemetryService {
  let consent: AnalyticsConsent = "unknown";

  return {
    async applyConsent(nextConsent) {
      if (nextConsent === "granted") {
        try {
          await analytics.setConsent("granted");
          await crashlytics.deleteUnsentReports();
          await Promise.all([analytics.setEnabled(true), crashlytics.setEnabled(true)]);
          consent = "granted";
        } catch {
          consent = "unknown";
          await Promise.allSettled([
            analytics.setEnabled(false),
            crashlytics.setEnabled(false),
            crashlytics.deleteUnsentReports(),
          ]);
        }
      } else {
        consent = "denied";
        await Promise.allSettled([
          analytics.setConsent("denied"),
          analytics.setEnabled(false),
          analytics.resetAnalyticsData(),
          crashlytics.setEnabled(false),
          crashlytics.deleteUnsentReports(),
        ]);
      }
      return { restartRequired: true };
    },

    async log(name, params = {}) {
      if (consent !== "granted") return;
      try {
        await analytics.logEvent(name, params);
      } catch {
        // Telemetry is optional and must never interrupt the educational flow.
      }
    },

    async recordError(error) {
      if (consent !== "granted") return;
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      try {
        await crashlytics.recordException(message);
      } catch {
        // Crash reporting is best-effort, including before Firebase is provisioned.
      }
    },
  };
}
