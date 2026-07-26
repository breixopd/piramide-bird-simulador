import "./styles/index.css";
import "./app";

import { Haptics, ImpactStyle } from "@capacitor/haptics";

import { AppController } from "./app-controller";
import type { BirdApp } from "./app";
import { MODELS } from "./domain/models";
import { createHistoryRepository } from "./platform/history";
import { createShakePreferenceController } from "./platform/motion";
import { renderShareCard } from "./platform/share-card";
import { buildShareContent, sharePng } from "./platform/share";
import { loadSettings, saveSettings } from "./platform/settings";
import { createTelemetryService } from "./platform/telemetry";

const controller = new AppController({
  history: createHistoryRepository("bird-pyramid-history"),
  loadSettings,
  saveSettings,
});

const app = document.querySelector<BirdApp>("bird-app");
if (!app) throw new Error("No se encontró el elemento raíz de la aplicación.");
app.controller = controller;
app.telemetry = createTelemetryService();
app.hapticFeedback = () => Haptics.impact({ style: ImpactStyle.Light });
app.shareLatest = async (run) => {
  const model = MODELS[run.modelId];
  const card = await renderShareCard(run, model);
  await sharePng(card, buildShareContent(run, model));
};

const shakePreference = createShakePreferenceController(() => app.requestStatisticsReset());
controller.subscribe(() => {
  void shakePreference.setEnabled(
    controller.state.initialized && controller.state.settings.shakeToReset,
  );
});

void controller
  .initialize()
  .then(async () => {
    const consent = controller.state.settings.analyticsConsent;
    if (consent !== "unknown") await app.telemetry?.applyConsent(consent);
    await shakePreference.setEnabled(controller.state.settings.shakeToReset);
  })
  .catch((error: unknown) => app.telemetry?.recordError(error));
