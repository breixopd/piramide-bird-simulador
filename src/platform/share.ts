import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export interface FileCachePort {
  writePng(filename: string, base64: string): Promise<string>;
}

export interface NativeSharePort {
  shareFile(uri: string, title: string): Promise<void>;
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

export const capacitorNativeShare: NativeSharePort = {
  async shareFile(uri, title) {
    await Share.share({ title, files: [uri], dialogTitle: title });
  },
};

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
  files: FileCachePort = capacitorFileCache,
  share: NativeSharePort = capacitorNativeShare,
): Promise<void> {
  const base64 = await blobToBase64(png);
  const uri = await files.writePng("bird-result.png", base64);
  await share.shareFile(uri, "Resultado de la Pirámide de Bird");
}
