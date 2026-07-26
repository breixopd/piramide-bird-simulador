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
});

test.afterEach(async ({ page }) => {
  expect(browserProblems.get(page) ?? [], "browser console should stay clean").toEqual([]);
});

test("keeps the responsive home composition visually stable", async ({ page }) => {
  await expect(page).toHaveScreenshot("home.png");
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
