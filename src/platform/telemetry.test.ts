import { describe, expect, it, vi } from "vitest";

import { createTelemetryService, type AnalyticsPort, type CrashlyticsPort } from "./telemetry";

function ports() {
  const analytics: AnalyticsPort = {
    setConsent: vi.fn(async () => undefined),
    setEnabled: vi.fn(async () => undefined),
    resetAnalyticsData: vi.fn(async () => undefined),
    logEvent: vi.fn(async () => undefined),
  };
  const crashlytics: CrashlyticsPort = {
    setEnabled: vi.fn(async () => undefined),
    deleteUnsentReports: vi.fn(async () => undefined),
    recordException: vi.fn(async () => undefined),
  };
  return { analytics, crashlytics };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("telemetry consent", () => {
  it("does not emit events before consent", async () => {
    const { analytics, crashlytics } = ports();
    const telemetry = createTelemetryService(analytics, crashlytics);

    await telemetry.log("simulation_completed", { model: "bird-classic", batch_size: 1 });

    expect(analytics.logEvent).not.toHaveBeenCalled();
  });

  it("grants analytics storage and enables both products", async () => {
    const { analytics, crashlytics } = ports();
    const telemetry = createTelemetryService(analytics, crashlytics);

    await telemetry.applyConsent("granted");
    await telemetry.log("simulation_completed", { batch_size: 100 });

    expect(analytics.setConsent).toHaveBeenCalledWith("granted");
    expect(analytics.setEnabled).toHaveBeenCalledWith(true);
    expect(crashlytics.deleteUnsentReports).toHaveBeenCalled();
    expect(crashlytics.setEnabled).toHaveBeenCalledWith(true);
    expect(analytics.logEvent).toHaveBeenCalledWith("simulation_completed", { batch_size: 100 });
  });

  it("revokes collection, resets analytics and deletes unsent crashes", async () => {
    const { analytics, crashlytics } = ports();
    const telemetry = createTelemetryService(analytics, crashlytics);
    await telemetry.applyConsent("granted");

    await telemetry.applyConsent("denied");
    await telemetry.log("screen_view", { screen: "stats" });

    expect(analytics.setConsent).toHaveBeenLastCalledWith("denied");
    expect(analytics.setEnabled).toHaveBeenLastCalledWith(false);
    expect(analytics.resetAnalyticsData).toHaveBeenCalled();
    expect(crashlytics.setEnabled).toHaveBeenLastCalledWith(false);
    expect(crashlytics.deleteUnsentReports).toHaveBeenCalledTimes(2);
    expect(analytics.logEvent).not.toHaveBeenCalled();
  });

  it("keeps the SDK and session denied when revocation follows a pending grant", async () => {
    const { analytics, crashlytics } = ports();
    const grantStarted = deferred();
    const releaseGrant = deferred();
    let analyticsConsent: "granted" | "denied" = "denied";
    let analyticsEnabled = false;
    let crashlyticsEnabled = false;

    vi.mocked(analytics.setConsent).mockImplementation(async (status) => {
      if (status === "granted") {
        grantStarted.resolve();
        await releaseGrant.promise;
      }
      analyticsConsent = status;
    });
    vi.mocked(analytics.setEnabled).mockImplementation(async (enabled) => {
      analyticsEnabled = enabled;
    });
    vi.mocked(crashlytics.setEnabled).mockImplementation(async (enabled) => {
      crashlyticsEnabled = enabled;
    });

    const telemetry = createTelemetryService(analytics, crashlytics);
    const grant = telemetry.applyConsent("granted");
    await grantStarted.promise;

    const denial = telemetry.applyConsent("denied");
    await Promise.resolve();
    await Promise.resolve();
    releaseGrant.resolve();
    await Promise.all([grant, denial]);
    await telemetry.log("simulation_run", { iterations: 1 });

    expect(analyticsConsent).toBe("denied");
    expect(analyticsEnabled).toBe(false);
    expect(crashlyticsEnabled).toBe(false);
    expect(analytics.setEnabled).not.toHaveBeenCalledWith(true);
    expect(crashlytics.setEnabled).not.toHaveBeenCalledWith(true);
    expect(analytics.logEvent).not.toHaveBeenCalled();
  });

  it("does not let an unavailable Firebase installation break the app", async () => {
    const { analytics, crashlytics } = ports();
    vi.mocked(analytics.setConsent).mockRejectedValueOnce(new Error("Firebase unavailable"));
    const telemetry = createTelemetryService(analytics, crashlytics);

    await expect(telemetry.applyConsent("granted")).resolves.toEqual({ restartRequired: true });
    await expect(telemetry.log("simulation_run", { iterations: 1 })).resolves.toBeUndefined();
    await expect(telemetry.recordError(new Error("UI failure"))).resolves.toBeUndefined();

    expect(analytics.logEvent).not.toHaveBeenCalled();
    expect(crashlytics.recordException).not.toHaveBeenCalled();
  });

  it("contains provider errors after consent has been applied", async () => {
    const { analytics, crashlytics } = ports();
    const telemetry = createTelemetryService(analytics, crashlytics);
    await telemetry.applyConsent("granted");
    vi.mocked(analytics.logEvent).mockRejectedValueOnce(new Error("Network failure"));
    vi.mocked(crashlytics.recordException).mockRejectedValueOnce(new Error("Native failure"));

    await expect(telemetry.log("screen_view", { screen: "home" })).resolves.toBeUndefined();
    await expect(telemetry.recordError(new Error("UI failure"))).resolves.toBeUndefined();
  });
});
