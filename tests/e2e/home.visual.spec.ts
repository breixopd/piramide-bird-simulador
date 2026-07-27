import { expect, test, type Page } from "@playwright/test";

type ObservedLaunchState = {
  outcome: string | null;
  className: string;
  icon: string;
};

const browserProblems = new WeakMap<Page, string[]>();

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
  await expect(dialog).toHaveScreenshot("telemetry-consent.png");
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
  await page.getByRole("button", { name: "Simular 100 eventos" }).click();
  await expect(page.getByRole("group", { name: "¿Cuál es el peligro principal?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Simular 1 evento" })).toBeEnabled({
    timeout: 5_000,
  });
  await page
    .getByRole("group", { name: "¿Cuál es el peligro principal?" })
    .scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);

  await expect(page).toHaveScreenshot("guided-question.png");
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

test("carries hazard-question progress into statistics and achievements", async ({ page }) => {
  await page.getByRole("button", { name: "Simular 1 evento" }).click();
  const question = page.getByRole("group", { name: "¿Cuál es el peligro principal?" });
  await expect(question).toBeVisible();
  await question.locator(".learning-check__options button").nth(2).click();
  await expect(page.getByText("Correcto: has identificado el peligro.")).toBeVisible();

  await page.getByRole("button", { name: "Estadísticas" }).click();
  const learningStats = page.getByRole("heading", {
    name: "Tus respuestas sobre peligros",
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
  const spotter = page.getByRole("article").filter({ hasText: "Detector de peligros" });
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
