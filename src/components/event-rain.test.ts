import { describe, expect, it } from "vitest";

import { selectVisibleOutcomes } from "./event-rain";

describe("event rain sampling", () => {
  it("keeps every observed outcome visible in a large skewed batch", () => {
    const visible = selectVisibleOutcomes({
      "near-miss": 959,
      "minor-injury": 30,
      "serious-injury": 10,
      fatality: 1,
    });

    expect(visible).toHaveLength(100);
    expect(new Set(visible)).toEqual(
      new Set(["near-miss", "minor-injury", "serious-injury", "fatality"]),
    );
  });

  it("returns all outcomes when the batch is already below the visual cap", () => {
    expect(selectVisibleOutcomes({ "near-miss": 2, "minor-injury": 1 })).toEqual([
      "near-miss",
      "minor-injury",
      "near-miss",
    ]);
  });
});
