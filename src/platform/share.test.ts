import { describe, expect, it, vi } from "vitest";

import { blobToBase64, sharePng, type FileCachePort, type NativeSharePort } from "./share";

describe("native result sharing", () => {
  it("converts a Blob to raw base64 without a data URL prefix", async () => {
    await expect(blobToBase64(new Blob(["Bird"], { type: "text/plain" }))).resolves.toBe(
      "QmlyZA==",
    );
  });

  it("writes the PNG to cache before sharing its URI", async () => {
    const files: FileCachePort = {
      writePng: vi.fn(async () => "content://cache/bird-result.png"),
    };
    const share: NativeSharePort = {
      shareFile: vi.fn(async () => undefined),
    };
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });

    await sharePng(png, files, share);

    expect(files.writePng).toHaveBeenCalledWith(
      "bird-result.png",
      expect.not.stringContaining("data:"),
    );
    expect(share.shareFile).toHaveBeenCalledWith(
      "content://cache/bird-result.png",
      "Resultado de la Pirámide de Bird",
    );
  });
});
