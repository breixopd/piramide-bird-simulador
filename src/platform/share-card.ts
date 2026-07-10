import type { SimulationModel } from "../domain/models";
import type { SimulationRunSummary } from "./history";

export interface ShareCanvas {
  width: number;
  height: number;
  getContext(contextId: "2d"): CanvasRenderingContext2D | null;
  toBlob(callback: BlobCallback, type?: string, quality?: number): void;
}

const COLORS: Record<string, string> = {
  "near-miss": "#5d8158",
  "property-damage": "#8e913d",
  "minor-injury": "#e2a326",
  "serious-injury": "#d43b2f",
  fatality: "#851f27",
};

export async function renderShareCard(
  run: SimulationRunSummary,
  model: SimulationModel,
  suppliedCanvas?: ShareCanvas,
): Promise<Blob> {
  const canvas = suppliedCanvas ?? document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("El dispositivo no permite crear la tarjeta de resultado.");

  context.fillStyle = "#f7f5f0";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#c92f24";
  context.fillRect(72, 78, 136, 12);

  context.textAlign = "left";
  context.fillStyle = "#171715";
  context.font = "700 78px 'Space Grotesk', sans-serif";
  context.fillText("Pirámide de Bird", 72, 196);
  context.fillStyle = "#c92f24";
  context.font = "700 28px 'Space Grotesk', sans-serif";
  context.fillText(model.label.toUpperCase(), 74, 250);

  context.fillStyle = "#4b4a46";
  context.font = "500 32px Inter, sans-serif";
  context.fillText(`Simulación educativa · ${run.iterations} eventos`, 72, 320);
  context.fillText(
    new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date(run.createdAt)),
    72,
    368,
  );

  model.outcomes
    .slice()
    .reverse()
    .forEach((outcome, index) => {
      const y = 440 + index * 176;
      context.fillStyle = COLORS[outcome.id] ?? "#555";
      context.fillRect(72, y, 20, 124);
      context.fillStyle = "#171715";
      context.font = "650 36px 'Space Grotesk', sans-serif";
      context.fillText(outcome.label, 126, y + 51);
      context.font = "700 58px 'Space Grotesk', sans-serif";
      context.fillText(String(run.counts[outcome.id] ?? 0), 126, y + 112);
    });

  const convergence = `${(run.convergenceScore * 100).toFixed(1).replace(".", ",")} %`;
  context.fillStyle = "#171715";
  context.font = "700 44px 'Space Grotesk', sans-serif";
  context.fillText(`Convergencia ${convergence}`, 72, 1190);
  context.fillStyle = "#686761";
  context.font = "500 25px Inter, sans-serif";
  context.fillText("Herramienta educativa · No sustituye una evaluación de riesgos", 72, 1262);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob === null
          ? reject(new Error("No se pudo exportar la tarjeta de resultado."))
          : resolve(blob),
      "image/png",
      0.96,
    );
  });
}
