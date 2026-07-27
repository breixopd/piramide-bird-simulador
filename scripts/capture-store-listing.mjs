import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const outputDirectory = join(projectRoot, "store-listing", "phone");
const port = 4174;
const baseUrl = `http://127.0.0.1:${port}`;

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const preview = spawn(
  "npm",
  ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(port)],
  {
    cwd: projectRoot,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let previewOutput = "";
preview.stdout.on("data", (chunk) => {
  previewOutput += chunk.toString();
});
preview.stderr.on("data", (chunk) => {
  previewOutput += chunk.toString();
});

async function waitForPreview() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await globalThis.fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolveDelay) => globalThis.setTimeout(resolveDelay, 250));
  }
  throw new Error(`El servidor de vista previa no arrancó.\n${previewOutput}`);
}

let browser;
try {
  await waitForPreview();
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 540, height: 960 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
    reducedMotion: "reduce",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  });
  const page = await context.newPage();
  const browserProblems = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      browserProblems.push(`console ${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => browserProblems.push(`page error: ${error.message}`));

  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto(baseUrl);
  await page.getByRole("heading", { name: "Pirámide de Bird" }).waitFor();

  const consentDialog = page.getByRole("dialog", { name: "¿Compartir datos técnicos?" });
  if (await consentDialog.isVisible()) {
    await consentDialog.getByRole("button", { name: "No permitir" }).click();
    await consentDialog.waitFor({ state: "hidden" });
  }

  const capture = async (filename, resetScroll = true) => {
    if (resetScroll) {
      await page.evaluate(() => {
        globalThis.scrollTo({ top: 0, behavior: "instant" });
        for (const element of globalThis.document.querySelectorAll("*")) {
          if (element.scrollTop > 0) element.scrollTop = 0;
        }
      });
    }
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: join(outputDirectory, filename),
      animations: "disabled",
      scale: "device",
    });
  };

  await capture("01-inicio.png");

  await page.getByRole("button", { name: "Modelo extendido", exact: true }).click();
  const modelDialog = page.getByRole("dialog");
  if (await modelDialog.isVisible()) {
    await modelDialog.getByRole("button", { name: "Comprendo, continuar" }).click();
    await modelDialog.waitFor({ state: "hidden" });
  }
  await page.getByRole("button", { name: "Simular 100 eventos" }).click();
  await page.locator('[aria-label="Simular 1 evento"]:not([disabled])').waitFor();
  await capture("02-simulacion.png");

  const question = page.getByRole("group", { name: "¿Cuál es el peligro principal?" });
  await question.waitFor();
  await question.scrollIntoViewIfNeeded();
  await capture("03-caso-preventivo.png", false);
  await question.locator(".learning-check__options button").nth(2).click();

  await page.getByRole("button", { name: "Estadísticas" }).click();
  await page.getByRole("heading", { name: "Estadísticas" }).waitFor();
  await capture("04-estadisticas.png");

  await page.getByRole("button", { name: "Logros" }).click();
  await page.getByRole("heading", { name: "Logros" }).waitFor();
  await capture("05-logros.png");

  await page.getByRole("button", { name: "Información" }).click();
  await page.getByRole("heading", { name: "Información" }).waitFor();
  await capture("06-privacidad-y-ajustes.png");

  if (browserProblems.length > 0) {
    throw new Error(`La consola del navegador no está limpia:\n${browserProblems.join("\n")}`);
  }

  await context.close();
} finally {
  await browser?.close();
  try {
    globalThis.process.kill(-preview.pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") {
      globalThis.console.warn(`No se pudo detener la vista previa: ${error.message}`);
    }
  }
}

globalThis.console.log(`Capturas de Google Play creadas en ${outputDirectory}`);
