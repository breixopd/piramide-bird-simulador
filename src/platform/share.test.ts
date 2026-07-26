import { describe, expect, it, vi } from "vitest";

import {
  blobToBase64,
  buildShareContent,
  createNativeShareAdapter,
  sharePng,
  type FileCachePort,
  type NativeSharePort,
} from "./share";
import { MODELS } from "../domain/models";

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

    const content = {
      title: "Resultado de la Pirámide de Bird",
      text: "He simulado 100 eventos.",
    };
    await sharePng(png, content, files, share);

    expect(files.writePng).toHaveBeenCalledWith(
      "bird-result.png",
      expect.not.stringContaining("data:"),
    );
    expect(share.shareFile).toHaveBeenCalledWith("content://cache/bird-result.png", content);
  });

  it("builds a non-empty message that explains the shared result", () => {
    const content = buildShareContent(
      {
        id: "run-1",
        modelId: "bird-classic",
        createdAt: "2026-07-10T10:00:00.000Z",
        iterations: 100,
        counts: { "near-miss": 94, "property-damage": 6 },
        convergenceScore: 0.981,
        batchConvergenceScore: 0.95,
      },
      MODELS["bird-classic"],
    );

    expect(content.title).toBe("Resultado de la Pirámide de Bird");
    expect(content.text.trim()).not.toBe("");
    expect(content.text).toContain("100 eventos");
    expect(content.text).toContain("Bird clásico");
    expect(content.text).toContain("95,0 %");
  });

  it("passes the message text and image attachment to the Android share sheet", async () => {
    const share = vi.fn(async () => ({ activityType: "test" }));
    const adapter = createNativeShareAdapter({ share });
    const content = {
      title: "Resultado de la Pirámide de Bird",
      text: "He simulado 100 eventos.",
    };

    await adapter.shareFile("file:///cache/bird-result.png", content);

    expect(share).toHaveBeenCalledWith({
      title: content.title,
      text: content.text,
      files: ["file:///cache/bird-result.png"],
      dialogTitle: content.title,
    });
  });
});
