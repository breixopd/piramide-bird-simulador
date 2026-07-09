import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { ModelId, OutcomeId } from "../domain/models";

export type SimulationBatchSize = 1 | 100 | 1000;

export interface SimulationRunSummary {
  readonly id: string;
  readonly modelId: ModelId;
  readonly createdAt: string;
  readonly iterations: SimulationBatchSize;
  readonly counts: Readonly<Partial<Record<OutcomeId, number>>>;
  readonly convergenceScore: number;
}

interface HistoryDatabase extends DBSchema {
  runs: {
    key: string;
    value: SimulationRunSummary;
    indexes: { "by-created-at": string };
  };
}

export interface HistoryRepository {
  save(run: SimulationRunSummary): Promise<void>;
  list(): Promise<SimulationRunSummary[]>;
  clear(): Promise<void>;
  close(): Promise<void>;
}

const DATABASE_VERSION = 1;
const MAX_HISTORY_ENTRIES = 500;

export function createHistoryRepository(databaseName: string): HistoryRepository {
  let databasePromise: Promise<IDBPDatabase<HistoryDatabase>> | undefined;

  function getDatabase(): Promise<IDBPDatabase<HistoryDatabase>> {
    databasePromise ??= openDB<HistoryDatabase>(databaseName, DATABASE_VERSION, {
      upgrade(database) {
        const store = database.createObjectStore("runs", { keyPath: "id" });
        store.createIndex("by-created-at", "createdAt");
      },
    });
    return databasePromise;
  }

  return {
    async save(run) {
      const database = await getDatabase();
      const transaction = database.transaction("runs", "readwrite");
      await transaction.store.put(run);

      let entriesToDelete = (await transaction.store.count()) - MAX_HISTORY_ENTRIES;
      let cursor =
        entriesToDelete > 0 ? await transaction.store.index("by-created-at").openCursor() : null;

      while (cursor !== null && entriesToDelete > 0) {
        await cursor.delete();
        entriesToDelete -= 1;
        cursor = await cursor.continue();
      }

      await transaction.done;
    },

    async list() {
      const database = await getDatabase();
      const entries = await database.getAllFromIndex("runs", "by-created-at");
      return entries.reverse();
    },

    async clear() {
      const database = await getDatabase();
      await database.clear("runs");
    },

    async close() {
      if (databasePromise === undefined) return;
      const database = await databasePromise;
      database.close();
      databasePromise = undefined;
    },
  };
}
