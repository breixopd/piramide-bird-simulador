import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { createHistoryRepository, type SimulationRunSummary } from "./history";

const databaseNames: string[] = [];

function uniqueDatabaseName(): string {
  const name = `bird-history-${crypto.randomUUID()}`;
  databaseNames.push(name);
  return name;
}

function run(
  id: string,
  createdAt: string,
  overrides: Partial<SimulationRunSummary> = {},
): SimulationRunSummary {
  return {
    id,
    modelId: "bird-classic",
    createdAt,
    iterations: 1,
    counts: { "near-miss": 1 },
    convergenceScore: 0.94,
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(
    databaseNames.splice(0).map(
      (name) =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          request.onblocked = () => reject(new Error(`Database ${name} is still open.`));
        }),
    ),
  );
});

describe("simulation history", () => {
  it("lists persisted summaries newest first", async () => {
    const history = createHistoryRepository(uniqueDatabaseName());
    await history.save(run("old", "2026-01-01T09:00:00.000Z"));
    await history.save(
      run("new", "2026-01-02T09:00:00.000Z", {
        modelId: "didactic-extended",
        iterations: 100,
        counts: { "near-miss": 94, "minor-injury": 5, fatality: 1 },
        convergenceScore: 0.98,
      }),
    );

    await expect(history.list()).resolves.toEqual([
      run("new", "2026-01-02T09:00:00.000Z", {
        modelId: "didactic-extended",
        iterations: 100,
        counts: { "near-miss": 94, "minor-injury": 5, fatality: 1 },
        convergenceScore: 0.98,
      }),
      run("old", "2026-01-01T09:00:00.000Z"),
    ]);
    await history.close();
  });

  it("keeps only the 500 newest summaries", async () => {
    const history = createHistoryRepository(uniqueDatabaseName());

    for (let index = 0; index < 503; index += 1) {
      await history.save(run(`run-${index}`, new Date(index * 1_000).toISOString()));
    }

    const saved = await history.list();
    expect(saved).toHaveLength(500);
    expect(saved[0]?.id).toBe("run-502");
    expect(saved.at(-1)?.id).toBe("run-3");
    await history.close();
  });

  it("clears history without deleting the repository", async () => {
    const history = createHistoryRepository(uniqueDatabaseName());
    await history.save(run("one", "2026-01-01T09:00:00.000Z"));

    await history.clear();
    await expect(history.list()).resolves.toEqual([]);
    await history.save(run("two", "2026-01-02T09:00:00.000Z"));
    await expect(history.list()).resolves.toEqual([run("two", "2026-01-02T09:00:00.000Z")]);
    await history.close();
  });
});
