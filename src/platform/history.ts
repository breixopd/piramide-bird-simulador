import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import { normalizeProgress, type ProgressState } from "../domain/progress";
import type { ModelId, OutcomeId } from "../domain/models";
import { cloneModelTotals, isModelTotals, type ModelTotals } from "./totals-storage";

export type SimulationBatchSize = 1 | 100 | 1000;

export interface SimulationRunSummary {
  readonly id: string;
  readonly modelId: ModelId;
  readonly createdAt: string;
  readonly iterations: SimulationBatchSize;
  readonly counts: Readonly<Partial<Record<OutcomeId, number>>>;
  readonly convergenceScore: number;
  /** Missing only on summaries persisted before batch convergence was introduced. */
  readonly batchConvergenceScore?: number;
}

export interface SimulationSnapshot {
  readonly totals: ModelTotals;
  readonly progress: ProgressState;
}

interface SnapshotRecord {
  readonly key: "current";
  readonly version: 1;
  readonly snapshot: SimulationSnapshot;
}

interface HistoryDatabase extends DBSchema {
  runs: {
    key: string;
    value: SimulationRunSummary;
    indexes: { "by-created-at": string };
  };
  metadata: {
    key: string;
    value: SnapshotRecord;
  };
}

export interface HistoryRepository {
  save(run: SimulationRunSummary, snapshot: SimulationSnapshot): Promise<void>;
  list(): Promise<SimulationRunSummary[]>;
  loadSnapshot(): Promise<SimulationSnapshot | null>;
  saveSnapshot(snapshot: SimulationSnapshot): Promise<void>;
  clear(snapshot: SimulationSnapshot): Promise<void>;
  close(): Promise<void>;
}

const DATABASE_VERSION = 2;
const MAX_HISTORY_ENTRIES = 500;
function cloneSnapshot(snapshot: SimulationSnapshot): SimulationSnapshot {
  return {
    totals: cloneModelTotals(snapshot.totals),
    progress: {
      ...snapshot.progress,
      unlocked: [...snapshot.progress.unlocked],
      answeredScenarioIds: [...snapshot.progress.answeredScenarioIds],
    },
  };
}

function readSnapshotRecord(value: unknown): SimulationSnapshot | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.key !== "current" || record.version !== 1) return null;
  if (typeof record.snapshot !== "object" || record.snapshot === null) return null;
  const snapshot = record.snapshot as Record<string, unknown>;
  const progress = normalizeProgress(snapshot.progress);
  return isModelTotals(snapshot.totals) && progress
    ? { totals: cloneModelTotals(snapshot.totals), progress }
    : null;
}

export function createHistoryRepository(databaseName: string): HistoryRepository {
  let databasePromise: Promise<IDBPDatabase<HistoryDatabase>> | undefined;

  function getDatabase(): Promise<IDBPDatabase<HistoryDatabase>> {
    databasePromise ??= openDB<HistoryDatabase>(databaseName, DATABASE_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          const store = database.createObjectStore("runs", { keyPath: "id" });
          store.createIndex("by-created-at", "createdAt");
        }
        if (oldVersion < 2) {
          database.createObjectStore("metadata", { keyPath: "key" });
        }
      },
    });
    return databasePromise;
  }

  return {
    async save(run, snapshot) {
      const database = await getDatabase();
      const transaction = database.transaction(["runs", "metadata"], "readwrite");
      try {
        const runStore = transaction.objectStore("runs");
        await runStore.put(run);
        await transaction.objectStore("metadata").put({
          key: "current",
          version: 1,
          snapshot: cloneSnapshot(snapshot),
        });

        let entriesToDelete = (await runStore.count()) - MAX_HISTORY_ENTRIES;
        let cursor =
          entriesToDelete > 0 ? await runStore.index("by-created-at").openCursor() : null;

        while (cursor !== null && entriesToDelete > 0) {
          await cursor.delete();
          entriesToDelete -= 1;
          cursor = await cursor.continue();
        }

        await transaction.done;
      } catch (error) {
        try {
          transaction.abort();
        } catch {
          // The browser may already have aborted the failed transaction.
        }
        await transaction.done.catch(() => undefined);
        throw error;
      }
    },

    async list() {
      const database = await getDatabase();
      const entries = await database.getAllFromIndex("runs", "by-created-at");
      return entries.reverse();
    },

    async loadSnapshot() {
      const database = await getDatabase();
      const stored: unknown = await database.get("metadata", "current");
      const snapshot = readSnapshotRecord(stored);
      return snapshot ? cloneSnapshot(snapshot) : null;
    },

    async saveSnapshot(snapshot) {
      const database = await getDatabase();
      await database.put("metadata", {
        key: "current",
        version: 1,
        snapshot: cloneSnapshot(snapshot),
      });
    },

    async clear(snapshot) {
      const database = await getDatabase();
      const transaction = database.transaction(["runs", "metadata"], "readwrite");
      try {
        await transaction.objectStore("runs").clear();
        await transaction.objectStore("metadata").put({
          key: "current",
          version: 1,
          snapshot: cloneSnapshot(snapshot),
        });
        await transaction.done;
      } catch (error) {
        try {
          transaction.abort();
        } catch {
          // The browser may already have aborted the failed transaction.
        }
        await transaction.done.catch(() => undefined);
        throw error;
      }
    },

    async close() {
      if (databasePromise === undefined) return;
      const database = await databasePromise;
      database.close();
      databasePromise = undefined;
    },
  };
}
