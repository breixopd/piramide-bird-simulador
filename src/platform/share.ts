import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import type { SimulationModel } from "../domain/models";
import { calculateConvergence } from "../domain/simulation";
import type { SimulationRunSummary } from "./history";

export interface FileCachePort {
  writePng(filename: string, base64: string): Promise<string>;
}

export interface ShareContent {
  readonly title: string;
  readonly text: string;
}

export interface NativeSharePort {
  shareFile(uri: string, content: ShareContent): Promise<void>;
}

interface SharePluginPort {
  share(options: {
    title: string;
    text: string;
    files: string[];
    dialogTitle: string;
  }): Promise<unknown>;
}

export const capacitorFileCache: FileCachePort = {
  async writePng(filename, base64) {
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
    });
    return result.uri;
  },
};

export function createNativeShareAdapter(plugin: SharePluginPort): NativeSharePort {
  return {
    async shareFile(uri, content) {
      await plugin.share({
        title: content.title,
        text: content.text,
        files: [uri],
        dialogTitle: content.title,
      });
    },
  };
}

export const capacitorNativeShare = createNativeShareAdapter(Share);

export function buildShareContent(run: SimulationRunSummary, model: SimulationModel): ShareContent {
  const convergence = run.batchConvergenceScore ?? calculateConvergence(model, run.counts);
  const percentage = (convergence * 100).toFixed(1).replace(".", ",");
  return {
    title: "Resultado de la Pirámide de Bird",
    text: [
      `Pirámide de Bird · ${model.label}`,
      `He simulado ${run.iterations.toLocaleString("es-ES")} ${run.iterations === 1 ? "evento" : "eventos"}.`,
      `Convergencia del lote: ${percentage} %.`,
      "Herramienta educativa de prevención de riesgos laborales.",
    ].join("\n"),
  };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("No se pudo leer la imagen exportada.")),
    );
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("No se pudo leer la imagen exportada.")),
    );
    reader.readAsDataURL(blob);
  });
  const separator = dataUrl.indexOf(",");
  if (separator < 0) throw new Error("El formato de la imagen exportada no es válido.");
  return dataUrl.slice(separator + 1);
}

export async function sharePng(
  png: Blob,
  content: ShareContent,
  files: FileCachePort = capacitorFileCache,
  share: NativeSharePort = capacitorNativeShare,
): Promise<void> {
  const base64 = await blobToBase64(png);
  const uri = await files.writePng("bird-result.png", base64);
  await share.shareFile(uri, content);
}
