import { expect, test, type Page } from "@playwright/test";

type ObservedLaunchState = {
  outcome: string | null;
  className: string;
  icon: string;
};

const browserProblems = new WeakMap<Page, string[]>();

async function useSeededRandom(page: Page, initialSeed: number): Promise<void> {
  await page.evaluate((seed) => {
    let state = seed >>> 0;
    Math.random = () => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state / 4_294_967_296;
    };
  }, initialSeed);
}

async function waitForBatchAnimation(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "Simular 1 evento" })).toBeEnabled({
    timeout: 5_000,
  });
}

test.beforeEach(async ({ page }) => {
  const problems: string[] = [];
  browserProblems.set(page, problems);
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`console ${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));

  await page.addInitScript(() => {
    Math.random = () => 0;
    let runNumber = 0;
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: () => `00000000-0000-4000-8000-${String(++runNumber).padStart(12, "0")}`,
    });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pirámide de Bird" })).toBeVisible();
  const consentDialog = page.getByRole("dialog", { name: "¿Compartir datos técnicos?" });
  if (await consentDialog.isVisible()) {
    await consentDialog.getByRole("button", { name: "No permitir" }).click();
    await expect(consentDialog).toBeHidden();
  }
});

test.afterEach(async ({ page }) => {
  expect(browserProblems.get(page) ?? [], "browser console should stay clean").toEqual([]);
});

test("keeps the responsive home composition visually stable", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Abrir desafío estadístico" })).toHaveCount(0);

  if (page.viewportSize()?.width === 390) {
    const navigationBox = await page
      .getByRole("navigation", { name: "Navegación principal" })
      .boundingBox();
    expect(navigationBox).not.toBeNull();
    expect(page.viewportSize()!.height - (navigationBox!.y + navigationBox!.height)).toBe(16);
  }

  await expect(page).toHaveScreenshot("home.png");
});

test("asks for optional telemetry consent on first launch", async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const dialog = page.getByRole("dialog", { name: "¿Compartir datos técnicos?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("La aplicación funciona igual si no lo permites");
  await expect(dialog.getByRole("button", { name: "No permitir" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Permitir", exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Leer la política de privacidad" }),
  ).toHaveAttribute("href", "./privacy.html");

  const dialogBox = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(16);
  expect(dialogBox!.y).toBeGreaterThanOrEqual(16);
  expect(viewport!.width - dialogBox!.x - dialogBox!.width).toBeGreaterThanOrEqual(16);
  expect(viewport!.height - dialogBox!.y - dialogBox!.height).toBeGreaterThanOrEqual(16);

  await expect(dialog).toHaveScreenshot("telemetry-consent.png");
});

test("returns from the privacy policy to the application", async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page
    .getByRole("dialog", { name: "¿Compartir datos técnicos?" })
    .getByRole("link", { name: "Leer la política de privacidad" })
    .click();

  await expect(page).toHaveURL(/\/privacy\.html$/);
  const returnLink = page.getByRole("link", { name: "Volver" });
  await expect(returnLink).toBeVisible();
  await returnLink.click();
  await expect(page.getByRole("heading", { name: "Pirámide de Bird" })).toBeVisible();
});

test("fits consent and batch results in a 320px Android viewport", async ({ page }) => {
  test.skip(page.viewportSize()?.width !== 390, "Covered once by the compact mobile project");
  await page.setViewportSize({ width: 320, height: 720 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const dialog = page.getByRole("dialog", { name: "¿Compartir datos técnicos?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "No permitir" }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("button", { name: "No permitir" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await dialog.getByRole("button", { name: "No permitir" }).click();

  await useSeededRandom(page, 320);
  await page.getByRole("button", { name: "Simular 1000 eventos" }).click();
  const result = page.getByRole("region", { name: "1000 eventos" });
  await expect(result).toBeVisible();
  await result.evaluate((element) => element.scrollIntoView({ block: "start" }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  for (const tab of ["Estadísticas", "Logros", "Información y ajustes"]) {
    await page.getByRole("button", { name: tab }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      tab,
    ).toBeLessThanOrEqual(320);
  }
});

test("places the statistical challenge in Statistics", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Abrir desafío estadístico" })).toHaveCount(0);
  await page.getByRole("button", { name: "Estadísticas" }).click();
  const challenge = page.getByRole("button", { name: "Abrir desafío estadístico" });
  await expect(challenge).toBeVisible();
  await challenge.click();
  await expect(page.getByRole("dialog", { name: "Desafío estadístico" })).toBeVisible();
});

test("keeps the level-detail action separated from its guidance", async ({ page }) => {
  await page.getByRole("button", { name: "Ver detalle de Daño material" }).click();
  const dialog = page.getByRole("dialog", { name: "Daño material" });
  await expect(dialog).toBeVisible();
  await dialog.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });

  const guidanceBox = await dialog.locator(".level-detail-guidance").boundingBox();
  const actionBox = await dialog.getByRole("button", { name: "Entendido" }).boundingBox();
  expect(guidanceBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  const actionGap = actionBox!.y - (guidanceBox!.y + guidanceBox!.height);
  expect(actionGap).toBeGreaterThanOrEqual(15);

  await expect(dialog).toHaveScreenshot("level-detail.png");
});

test("keeps the guided question visually stable after a result", async ({ page }) => {
  await page.getByRole("button", { name: "Simular 1 evento" }).click();
  const question = page.locator(".learning-check");
  await expect(question).toBeVisible();
  await expect(page.getByRole("button", { name: "Simular 1 evento" })).toBeEnabled({
    timeout: 5_000,
  });
  await question.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);

  await expect(page).toHaveScreenshot("guided-question.png");
});

test("turns 100 events into a practical shift summary with one optional question", async ({
  page,
}) => {
  await useSeededRandom(page, 100);
  await page.getByRole("button", { name: "Simular 100 eventos" }).click();
  const result = page.getByRole("region", { name: "100 eventos" });
  await expect(result).toContainText("Turno de 100 eventos");
  await expect(result).toContainText("cuasi accidentes en este turno");
  await expect(result.getByRole("heading", { name: "Distribución observada" })).toBeVisible();
  await expect(
    result.getByRole("heading", { name: "Pon a prueba tu mirada preventiva" }),
  ).toBeVisible();
  await expect(result.locator(".batch-distribution li")).toHaveCount(4);
  await waitForBatchAnimation(page);
  await result.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot("batch-100.png");

  await result.getByRole("button", { name: "Responder pregunta" }).click();
  await expect(result.locator(".learning-check")).toBeVisible();
  await expect(result.locator(".learning-check")).toHaveCount(1);
});

test("turns 1000 events into a statistical report", async ({ page }) => {
  await useSeededRandom(page, 1000);
  await page.getByRole("button", { name: "Simular 1000 eventos" }).click();
  const result = page.getByRole("region", { name: "1000 eventos" });
  await expect(result).toContainText("Informe de convergencia");
  await expect(result).toContainText("Ajuste de esta muestra");
  await expect(result).toContainText("Histórico");
  await expect(result.locator(".batch-distribution li")).toHaveCount(4);
  await waitForBatchAnimation(page);
  await result.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.mouse.move(0, 0);

  await expect(page).toHaveScreenshot("batch-1000.png");
});

test("does not replay an old batch rain after tab navigation", async ({ page }) => {
  await useSeededRandom(page, 1000);
  await page.getByRole("button", { name: "Simular 1000 eventos" }).click();
  await page.getByRole("button", { name: "Estadísticas" }).click();
  await page.getByRole("button", { name: "Inicio" }).click();

  await expect(page.locator(".event-rain__particle")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Simular 1 evento" })).toContainText("Lanzar");
});

test("keeps every main screen coherent in the dark theme", async ({ page }) => {
  test.skip(page.viewportSize()?.width !== 390, "Covered once by the compact mobile project");

  const appMain = page.locator(".app-main");
  const expectNoHorizontalOverflow = async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
  };
  const scrollToTop = () => appMain.evaluate((element) => element.scrollTo({ top: 0 }));

  await page.getByRole("button", { name: "Información y ajustes" }).click();
  await page.getByLabel("Tema").selectOption("dark");
  await expect(page.locator("bird-app")).toHaveAttribute("data-theme", "dark");
  await scrollToTop();
  await expectNoHorizontalOverflow();
  await expect(page).toHaveScreenshot("info-dark.png");

  await page.getByRole("button", { name: "Inicio" }).click();
  await useSeededRandom(page, 1000);
  await page.getByRole("button", { name: "Simular 1000 eventos" }).click();
  const report = page.getByRole("region", { name: "1000 eventos" });
  await waitForBatchAnimation(page);
  await report.evaluate((element) => element.scrollIntoView({ block: "start" }));
  const reportTheme = await report.locator(".batch-report-score").evaluate((element) => {
    const style = getComputedStyle(element);
    const app = element.closest("bird-app");
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--ink)";
    probe.style.color = "var(--ink)";
    app?.append(probe);
    const probeStyle = getComputedStyle(probe);
    const invertedBackground = probeStyle.backgroundColor;
    const expectedColor = probeStyle.color;
    probe.remove();
    return {
      background: style.backgroundColor,
      invertedBackground,
      color: style.color,
      expectedColor,
      borderRadius: style.borderRadius,
    };
  });
  expect(reportTheme.background).not.toBe(reportTheme.invertedBackground);
  expect(reportTheme.color).toBe(reportTheme.expectedColor);
  expect(reportTheme.borderRadius).not.toBe("0px");
  await expectNoHorizontalOverflow();
  await expect(page).toHaveScreenshot("batch-1000-dark.png");

  await page.getByRole("button", { name: "Estadísticas" }).click();
  await scrollToTop();
  await expectNoHorizontalOverflow();
  await expect(page).toHaveScreenshot("stats-dark.png");
  const chart = page.locator("convergence-chart");
  await chart.scrollIntoViewIfNeeded();
  await expect(chart).toHaveScreenshot("convergence-chart-dark.png");

  await page.getByRole("button", { name: "Logros" }).click();
  await scrollToTop();
  await expectNoHorizontalOverflow();
  await expect(page).toHaveScreenshot("achievements-dark.png");
});

test("cycles through outcome colours and symbols before settling", async ({ page }) => {
  const launch = page.getByRole("button", { name: "Simular 1 evento" });
  await launch.evaluate((element) => {
    const button = element as HTMLButtonElement;
    const observed: ObservedLaunchState[] = [];
    Object.assign(window, { __birdLaunchStates: observed });
    new MutationObserver(() => {
      observed.push({
        outcome: button.dataset.outcome ?? null,
        className: button.className,
        icon: button.querySelector(".launch-symbol svg")?.innerHTML ?? "",
      });
    }).observe(button, { attributes: true, attributeFilter: ["data-outcome"] });
  });

  await launch.click();
  await expect(launch).toContainText("Lanzando…");
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Set(
              (
                window as typeof window & {
                  __birdLaunchStates?: ObservedLaunchState[];
                }
              ).__birdLaunchStates?.map(({ outcome }) => outcome),
            ).size,
        ),
      { timeout: 3_000 },
    )
    .toBeGreaterThanOrEqual(4);

  await expect(launch).toBeEnabled({ timeout: 5_000 });
  await expect(launch).toContainText("Lanzar");
  await expect(launch).toHaveAttribute("data-outcome", "near-miss");

  const observed = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __birdLaunchStates?: ObservedLaunchState[];
        }
      ).__birdLaunchStates ?? [],
  );
  expect(new Set(observed.map(({ icon }) => icon)).size).toBeGreaterThanOrEqual(4);
  for (const state of observed) {
    expect(state.className).toContain(`outcome-${state.outcome}`);
  }
});

test("carries preventive-question progress into statistics and achievements", async ({ page }) => {
  await page.getByRole("button", { name: "Simular 1 evento" }).click();
  const question = page.locator(".learning-check");
  await expect(question).toBeVisible();
  await question.locator('button[data-correct="true"]').click();
  await expect(page.locator(".learning-feedback.is-correct")).toBeVisible();

  await page.getByRole("button", { name: "Estadísticas" }).click();
  const learningStats = page.getByRole("heading", {
    name: "Tus respuestas preventivas",
  });
  await expect(learningStats).toBeVisible();
  const learningSection = page.locator('[aria-labelledby="learning-stats-title"]');
  await expect(learningSection).toContainText("Preguntas respondidas");
  await expect(learningSection).toContainText("Precisión");
  await expect(learningSection).toContainText("100 %");
  await expect(learningSection).toContainText("Casos explorados");
  await learningSection.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot("learning-stats.png");

  await page.getByRole("button", { name: "Logros" }).click();
  const spotter = page.getByRole("article").filter({ hasText: "Primer análisis" });
  await expect(spotter).toContainText("Desbloqueado");
  await expect(page.getByRole("article").filter({ hasText: "Racha preventiva" })).toContainText(
    "1 de 5",
  );
  await expect(page.getByRole("article").filter({ hasText: "Explorador de casos" })).toContainText(
    "1 de 10",
  );
  await spotter.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot("question-achievements.png");
});
