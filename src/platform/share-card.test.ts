import { describe, expect, it, vi } from "vitest";

import { MODELS } from "../domain/models";
import type { SimulationRunSummary } from "./history";
import { renderShareCard, type ShareCanvas } from "./share-card";

describe("result share card", () => {
  it("renders a 1080x1350 educational summary without scenario text", async () => {
    const labels: string[] = [];
    const context = {
      fillStyle: "",
      font: "",
      textAlign: "left",
      fillRect: vi.fn(),
      fillText: vi.fn((text: string) => labels.push(text)),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const canvas: ShareCanvas = {
      width: 0,
      height: 0,
      getContext: () => context,
      toBlob: (callback) => callback(new Blob(["png"], { type: "image/png" })),
    };
    const run: SimulationRunSummary = {
      id: "run-1",
      modelId: "bird-classic",
      createdAt: "2026-07-10T10:00:00.000Z",
      iterations: 100,
      counts: { "near-miss": 94, "property-damage": 4, "minor-injury": 2 },
      convergenceScore: 0.973,
    };

    const blob = await renderShareCard(run, MODELS["bird-classic"], canvas);

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1350);
    expect(blob.type).toBe("image/png");
    expect(labels).toContain("Pirámide de Bird");
    expect(labels).toContain("Simulación educativa · 100 eventos");
    expect(labels).toContain("Convergencia 97,3 %");
    expect(labels).toContain("Cuasi-accidente");
    expect(labels.join(" ")).not.toMatch(/Iván|Sonia|relato/i);
  });
});
