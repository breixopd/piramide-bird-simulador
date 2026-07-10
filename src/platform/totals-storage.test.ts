import { describe, expect, it } from "vitest";

import { emptyModelTotals, loadModelTotals, saveModelTotals } from "./totals-storage";

class MemoryStore {
  value: string | null = null;
  async get() {
    return this.value;
  }
  async set(_key: string, value: string) {
    this.value = value;
  }
}

describe("lifetime totals storage", () => {
  it("distinguishes a new installation from persisted empty totals", async () => {
    const storage = new MemoryStore();
    expect(await loadModelTotals(storage)).toBeNull();

    const totals = emptyModelTotals();
    await saveModelTotals(totals, storage);
    expect(await loadModelTotals(storage)).toEqual(totals);
  });

  it("rejects malformed or negative counts", async () => {
    const storage = new MemoryStore();
    storage.value = JSON.stringify({
      version: 1,
      totals: { "bird-classic": { "near-miss": -1 }, "didactic-extended": {} },
    });
    expect(await loadModelTotals(storage)).toBeNull();
  });
});
