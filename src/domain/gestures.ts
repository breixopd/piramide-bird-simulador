export interface GesturePoint {
  readonly x: number;
  readonly y: number;
}

export type SwipeDirection = "left" | "right";

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const MIN_SWIPE_DISTANCE = 56;
const HORIZONTAL_DOMINANCE = 1.35;

export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function distance(first: GesturePoint, second: GesturePoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function classifyHorizontalSwipe(
  start: GesturePoint,
  end: GesturePoint,
): SwipeDirection | null {
  const horizontal = end.x - start.x;
  const vertical = end.y - start.y;
  if (
    Math.abs(horizontal) < MIN_SWIPE_DISTANCE ||
    Math.abs(horizontal) < Math.abs(vertical) * HORIZONTAL_DOMINANCE
  ) {
    return null;
  }
  return horizontal < 0 ? "left" : "right";
}
