import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { INITIAL_PROGRESS } from "../domain/progress";
import { createHistoryRepository, type SimulationRunSummary } from "./history";
import { emptyModelTotals } from "./totals-storage";

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

function snapshot() {
  return { totals: emptyModelTotals(), progress: INITIAL_PROGRESS };
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
    await history.save(run("old", "2026-01-01T09:00:00.000Z"), snapshot());
    await history.save(
      run("new", "2026-01-02T09:00:00.000Z", {
        modelId: "didactic-extended",
        iterations: 100,
        counts: { "near-miss": 94, "minor-injury": 5, fatality: 1 },
        convergenceScore: 0.98,
      }),
      snapshot(),
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
      const state = snapshot();
      state.totals["bird-classic"]["near-miss"] = index + 1;
      await history.save(run(`run-${index}`, new Date(index * 1_000).toISOString()), state);
    }

    const saved = await history.list();
    expect(saved).toHaveLength(500);
    expect(saved[0]?.id).toBe("run-502");
    expect(saved.at(-1)?.id).toBe("run-3");
    await expect(history.loadSnapshot()).resolves.toMatchObject({
      totals: { "bird-classic": { "near-miss": 503 } },
    });
    await history.close();
  });

  it("clears history without deleting the repository", async () => {
    const history = createHistoryRepository(uniqueDatabaseName());
    await history.save(run("one", "2026-01-01T09:00:00.000Z"), snapshot());

    await history.clear(snapshot());
    await expect(history.list()).resolves.toEqual([]);
    await history.save(run("two", "2026-01-02T09:00:00.000Z"), snapshot());
    await expect(history.list()).resolves.toEqual([run("two", "2026-01-02T09:00:00.000Z")]);
    await history.close();
  });

  it("commits a run and its cumulative state in one transaction", async () => {
    const history = createHistoryRepository(uniqueDatabaseName());
    const state = snapshot();
    state.totals["bird-classic"]["near-miss"] = 1;

    await history.save(run("one", "2026-01-01T09:00:00.000Z"), state);

    await expect(history.loadSnapshot()).resolves.toEqual(state);
    await history.close();
  });

  it("rolls back the run when its cumulative state cannot be stored", async () => {
    const history = createHistoryRepository(uniqueDatabaseName());
    const invalidState = snapshot();
    (invalidState.totals["bird-classic"] as Record<string, unknown>)["near-miss"] =
      Symbol("not-cloneable");

    await expect(
      history.save(run("partial", "2026-01-01T09:00:00.000Z"), invalidState),
    ).rejects.toBeDefined();
    await expect(history.list()).resolves.toEqual([]);
    await expect(history.loadSnapshot()).resolves.toBeNull();
    await history.close();
  });

  it("rolls back a clear when the replacement snapshot cannot be stored", async () => {
    const history = createHistoryRepository(uniqueDatabaseName());
    const state = snapshot();
    state.totals["bird-classic"]["near-miss"] = 1;
    await history.save(run("kept", "2026-01-01T09:00:00.000Z"), state);
    const invalidState = snapshot();
    (invalidState.totals["bird-classic"] as Record<string, unknown>)["near-miss"] =
      Symbol("not-cloneable");

    await expect(history.clear(invalidState)).rejects.toBeDefined();

    await expect(history.list()).resolves.toHaveLength(1);
    await expect(history.loadSnapshot()).resolves.toEqual(state);
    await history.close();
  });

  it("upgrades a version 1 history database without deleting saved runs", async () => {
    const databaseName = uniqueDatabaseName();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore("runs", { keyPath: "id" });
        store.createIndex("by-created-at", "createdAt");
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("runs", "readwrite");
        transaction.objectStore("runs").put(run("legacy", "2026-01-01T09:00:00.000Z"));
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });

    const history = createHistoryRepository(databaseName);
    await expect(history.list()).resolves.toEqual([
      run("legacy", "2026-01-01T09:00:00.000Z"),
    ]);
    await expect(history.loadSnapshot()).resolves.toBeNull();
    await history.close();
  });
});
