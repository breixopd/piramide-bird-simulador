import { describe, expect, it } from "vitest";

import { clampZoom, classifyHorizontalSwipe, distance } from "./gestures";

describe("gesture helpers", () => {
  it("clamps pyramid zoom between 1 and 2.5", () => {
    expect(clampZoom(0.4)).toBe(1);
    expect(clampZoom(1.75)).toBe(1.75);
    expect(clampZoom(4)).toBe(2.5);
  });

  it("calculates the distance between two touch points", () => {
    expect(distance({ x: 1, y: 2 }, { x: 4, y: 6 })).toBe(5);
  });

  it("classifies deliberate horizontal swipes in both directions", () => {
    expect(classifyHorizontalSwipe({ x: 240, y: 100 }, { x: 120, y: 110 })).toBe("left");
    expect(classifyHorizontalSwipe({ x: 80, y: 100 }, { x: 170, y: 85 })).toBe("right");
  });

  it("ignores short movements and predominantly vertical scrolling", () => {
    expect(classifyHorizontalSwipe({ x: 100, y: 100 }, { x: 140, y: 102 })).toBeNull();
    expect(classifyHorizontalSwipe({ x: 100, y: 100 }, { x: 155, y: 210 })).toBeNull();
  });
});
