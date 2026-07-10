import { fireEvent, getByLabelText, getByRole, getByText, queryByRole } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppController } from "./app-controller";
import "./app";
import type { BirdApp } from "./app";
import { INITIAL_PROGRESS } from "./domain/progress";
import type {
  HistoryRepository,
  SimulationRunSummary,
  SimulationSnapshot,
} from "./platform/history";
import { DEFAULT_SETTINGS } from "./platform/settings";
import { emptyModelTotals } from "./platform/totals-storage";

function createController() {
  let history: SimulationRunSummary[] = [];
  let snapshot: SimulationSnapshot = {
    totals: emptyModelTotals(),
    progress: INITIAL_PROGRESS,
  };
  const repository: HistoryRepository = {
    async save(run, nextSnapshot) {
      history = [run, ...history];
      snapshot = nextSnapshot;
    },
    async list() {
      return history;
    },
    async loadSnapshot() {
      return snapshot;
    },
    async saveSnapshot(nextSnapshot) {
      snapshot = nextSnapshot;
    },
    async clear(nextSnapshot) {
      history = [];
      snapshot = nextSnapshot;
    },
    async close() {},
  };

  return new AppController({
    history: repository,
    loadSettings: async () => ({ ...DEFAULT_SETTINGS }),
    saveSettings: async () => undefined,
    createId: () => "run-1",
    now: () => new Date("2026-07-10T10:30:00.000Z"),
    scenarioRandom: () => 0,
  });
}

async function renderApp(): Promise<BirdApp> {
  const controller = createController();
  await controller.initialize();
  const element = document.createElement("bird-app") as BirdApp;
  element.controller = controller;
  document.body.append(element);
  await element.updateComplete;
  return element;
}

describe("bird-app", () => {
  beforeEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("shows a safe loading state when upgraded before its controller is attached", async () => {
    const app = document.createElement("bird-app") as BirdApp;
    document.body.append(app);
    await app.updateComplete;

    expect(getByText(app, "Preparando el simulador…")).toBeTruthy();

    const controller = createController();
    await controller.initialize();
    app.controller = controller;
    await app.updateComplete;

    expect(getByRole(app, "heading", { name: "Pirámide de Bird" })).toBeTruthy();
  });

  it("renders the classic model and navigates with labelled bottom tabs", async () => {
    const app = await renderApp();

    expect(getByRole(app, "heading", { name: "Pirámide de Bird" })).toBeTruthy();
    expect(getByText(app, "Cuasi-accidente")).toBeTruthy();
    expect(getByText(app, "600")).toBeTruthy();
    const levels = [...app.querySelectorAll<HTMLElement>(".pyramid__level")];
    expect(levels[0]?.style.getPropertyValue("--level-width")).toBe("42%");
    expect(levels.at(-1)?.style.getPropertyValue("--level-width")).toBe("100%");

    fireEvent.click(getByRole(app, "button", { name: /estadísticas/i }));
    await app.updateComplete;

    expect(getByRole(app, "heading", { name: "Estadísticas" })).toBeTruthy();
    expect(getByText(app, "Aún no hay simulaciones")).toBeTruthy();
  });

  it("keeps a one-event launch action available in the bottom dock", async () => {
    const app = await renderApp();

    fireEvent.click(getByRole(app, "button", { name: "Lanzar un evento rápido" }));

    await vi.waitFor(() => expect(app.controller?.state.latestRun?.iterations).toBe(1));
    await app.updateComplete;
    expect(getByRole(app, "status").textContent).toContain("1 evento simulado");
  });

  it("ignores repeated dock launches while a simulation is running", async () => {
    const app = await renderApp();
    const log = vi.fn(async () => undefined);
    const hapticFeedback = vi.fn(async () => undefined);
    app.telemetry = {
      applyConsent: async () => ({ restartRequired: false }),
      log,
      recordError: async () => undefined,
    };
    app.hapticFeedback = hapticFeedback;
    await app.updateComplete;

    const launch = getByRole(app, "button", { name: "Lanzar un evento rápido" });
    fireEvent.click(launch);
    fireEvent.click(launch);

    await vi.waitFor(() => expect(app.controller?.state.latestRun).not.toBeNull());
    await app.updateComplete;
    expect(log).toHaveBeenCalledTimes(1);
    expect(hapticFeedback).toHaveBeenCalledTimes(1);
  });

  it("requires an acknowledgement before activating the extended model", async () => {
    const app = await renderApp();

    fireEvent.click(getByRole(app, "button", { name: "Modelo extendido" }));
    await app.updateComplete;

    expect(getByRole(app, "dialog", { name: "Modelo extendido" })).toBeTruthy();
    expect(app.controller?.state.activeModelId).toBe("bird-classic");

    fireEvent.click(getByRole(app, "button", { name: /comprendo, continuar/i }));
    await vi.waitFor(() => expect(app.controller?.state.activeModelId).toBe("didactic-extended"));
    await app.updateComplete;

    expect(getByText(app, "Fatalidad")).toBeTruthy();
    expect(getByText(app, "Adaptación didáctica")).toBeTruthy();
  });

  it("closes modals with Escape and restores focus to the opener", async () => {
    const app = await renderApp();
    const opener = getByRole(app, "button", { name: /abrir desafío/i });
    opener.focus();
    fireEvent.click(opener);
    await app.updateComplete;
    const dialog = getByRole(app, "dialog", { name: "Desafío estadístico" });

    fireEvent.keyDown(dialog, { key: "Escape" });
    await vi.waitFor(() =>
      expect(queryByRole(app, "dialog", { name: "Desafío estadístico" })).toBeNull(),
    );
    expect(document.activeElement).toBe(opener);
  });

  it("offers visible, labelled controls to zoom and reset the pyramid", async () => {
    const app = await renderApp();
    const pyramid = app.querySelector<HTMLElement>("bird-pyramid");

    expect(pyramid?.style.getPropertyValue("--pyramid-zoom")).toBe("1");

    fireEvent.click(getByRole(app, "button", { name: "Ampliar pirámide" }));
    await app.updateComplete;
    expect(pyramid?.style.getPropertyValue("--pyramid-zoom")).toBe("1.25");
    expect(
      getByRole(app, "button", { name: "Restablecer zoom de la pirámide" }).textContent,
    ).toContain("125 %");

    fireEvent.click(getByRole(app, "button", { name: "Restablecer zoom de la pirámide" }));
    await app.updateComplete;
    expect(pyramid?.style.getPropertyValue("--pyramid-zoom")).toBe("1");
  });

  it("opens an accessible level detail with theoretical and observed statistics", async () => {
    const app = await renderApp();
    await app.controller?.run(1, () => 0);
    await app.updateComplete;

    const level = getByRole(app, "button", { name: "Ver detalle de Cuasi-accidente" });
    fireEvent.click(level);
    await app.updateComplete;

    const dialog = getByRole(app, "dialog", { name: "Cuasi-accidente" });
    expect(getByText(dialog, "600 de 641 (93,6 %)")).toBeTruthy();
    expect(getByText(dialog, "1 de 1 (100 %)")).toBeTruthy();
    expect(getByText(dialog, /actuar antes de que el peligro cause daño/i)).toBeTruthy();
  });

  it("routes a left swipe through the extended-model acknowledgement", async () => {
    const app = await renderApp();
    const surface = app.querySelector<HTMLElement>("[data-gesture-surface='pyramid']");
    if (!surface) throw new Error("Missing pyramid gesture surface");

    fireEvent.touchStart(surface, {
      touches: [{ identifier: 1, clientX: 260, clientY: 120 }],
      changedTouches: [{ identifier: 1, clientX: 260, clientY: 120 }],
    });
    fireEvent.touchEnd(surface, {
      touches: [],
      changedTouches: [{ identifier: 1, clientX: 120, clientY: 128 }],
    });
    await app.updateComplete;

    expect(getByRole(app, "dialog", { name: "Modelo extendido" })).toBeTruthy();
    expect(app.controller?.state.activeModelId).toBe("bird-classic");
  });

  it("zooms the pyramid with a two-finger pinch", async () => {
    const app = await renderApp();
    const surface = app.querySelector<HTMLElement>("[data-gesture-surface='pyramid']");
    if (!surface) throw new Error("Missing pyramid gesture surface");

    fireEvent.touchStart(surface, {
      touches: [
        { identifier: 1, clientX: 100, clientY: 100 },
        { identifier: 2, clientX: 200, clientY: 100 },
      ],
    });
    fireEvent.touchMove(surface, {
      touches: [
        { identifier: 1, clientX: 50, clientY: 100 },
        { identifier: 2, clientX: 250, clientY: 100 },
      ],
    });

    await vi.waitFor(() =>
      expect(
        app.querySelector<HTMLElement>("bird-pyramid")?.style.getPropertyValue("--pyramid-zoom"),
      ).toBe("2"),
    );
  });

  it("opens level detail after a 500 ms long press", async () => {
    vi.useFakeTimers();
    const app = await renderApp();
    const level = getByRole(app, "button", { name: "Ver detalle de Cuasi-accidente" });

    fireEvent.pointerDown(level, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    await vi.advanceTimersByTimeAsync(500);
    await app.updateComplete;

    expect(getByRole(app, "dialog", { name: "Cuasi-accidente" })).toBeTruthy();
    vi.useRealTimers();
  });

  it("runs a batch and announces its result with a preventive scenario", async () => {
    const app = await renderApp();

    fireEvent.click(getByRole(app, "button", { name: "Simular 100 eventos" }));

    await vi.waitFor(() => expect(app.controller?.state.latestRun?.iterations).toBe(100));
    await app.updateComplete;

    const status = getByRole(app, "status");
    expect(status.textContent).toContain("100 eventos simulados");
    expect(getByRole(app, "heading", { name: "Caso preventivo" })).toBeTruthy();
    expect(getByText(app, "Qué habría que hacer")).toBeTruthy();
  });

  it("shares the latest run through the injected native adapter", async () => {
    const app = await renderApp();
    const shareLatest = vi.fn(async () => undefined);
    app.shareLatest = shareLatest;

    fireEvent.click(getByRole(app, "button", { name: "Simular 1 evento" }));
    await vi.waitFor(() => expect(app.controller?.state.latestRun).not.toBeNull());
    await app.updateComplete;
    fireEvent.click(getByRole(app, "button", { name: "Compartir tarjeta de resultado" }));

    await vi.waitFor(() => expect(shareLatest).toHaveBeenCalledOnce());
  });

  it("evaluates the statistical challenge and presents the target", async () => {
    const app = await renderApp();

    fireEvent.click(getByRole(app, "button", { name: /abrir desafío/i }));
    await app.updateComplete;
    const input = getByLabelText(app, /número de simulaciones/i);
    fireEvent.input(input, { target: { value: "444" } });
    fireEvent.click(getByRole(app, "button", { name: "Comprobar estimación" }));
    await app.updateComplete;

    expect(getByText(app, "Excelente intuición estadística")).toBeTruthy();
    expect(getByText(app, /objetivo del 50 % se alcanza en 444/i)).toBeTruthy();
  });

  it("persists accessibility settings and confirms destructive reset", async () => {
    const app = await renderApp();
    fireEvent.click(getByRole(app, "button", { name: /información y ajustes/i }));
    await app.updateComplete;

    fireEvent.click(getByRole(app, "switch", { name: "Reducir movimiento" }));
    await vi.waitFor(() => expect(app.controller?.state.settings.reducedMotion).toBe(true));
    expect(app.getAttribute("data-motion")).toBe("reduced");

    fireEvent.click(getByRole(app, "button", { name: "Borrar estadísticas" }));
    await app.updateComplete;
    expect(getByRole(app, "dialog", { name: "Borrar estadísticas" })).toBeTruthy();

    fireEvent.click(getByRole(app, "button", { name: "Cancelar" }));
    await app.updateComplete;
    expect(queryByRole(app, "dialog", { name: "Borrar estadísticas" })).toBeNull();
  });

  it("exposes the full privacy policy beside analytics consent", async () => {
    const app = await renderApp();
    fireEvent.click(getByRole(app, "button", { name: /información y ajustes/i }));
    await app.updateComplete;

    const link = getByRole(app, "link", { name: "Leer la política de privacidad" });
    expect(link.getAttribute("href")).toBe("./privacy.html");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("warns visibly when local persistence is unavailable", async () => {
    const failure = async () => {
      throw new Error("Storage unavailable");
    };
    const controller = new AppController({
      history: {
        save: failure,
        list: failure,
        loadSnapshot: failure,
        saveSnapshot: failure,
        clear: failure,
        close: async () => undefined,
      },
      loadSettings: failure,
      saveSettings: failure,
    });
    await controller.initialize();
    const app = document.createElement("bird-app") as BirdApp;
    app.controller = controller;
    document.body.append(app);
    await app.updateComplete;

    expect(getByRole(app, "alert").textContent).toContain("no se guardarán");
  });
});
