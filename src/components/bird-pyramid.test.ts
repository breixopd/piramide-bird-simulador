import { fireEvent } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MODELS } from "../domain/models";
import type { BirdPyramid } from "./bird-pyramid";
import "./bird-pyramid";

afterEach(() => {
  document.body.replaceChildren();
});

describe("bird pyramid interaction", () => {
  it("renders a true triangular silhouette with straight outer edges", async () => {
    const pyramid = document.createElement("bird-pyramid") as BirdPyramid;
    pyramid.model = MODELS["bird-classic"];
    document.body.append(pyramid);
    await pyramid.updateComplete;

    const paths = [...pyramid.querySelectorAll<SVGPathElement>(".pyramid__level path")];
    expect(paths).toHaveLength(4);
    expect(paths[0]?.getAttribute("d")).toBe("M150,20 L150,20 L190,95 L110,95 Z");
    expect(paths.at(-1)?.getAttribute("d")).toBe("M54,200 L246,200 L278,260 L22,260 Z");
    expect(pyramid.querySelector(".pyramid__weight")?.getAttribute("y")).toBe("70");
    expect(pyramid.querySelector(".pyramid__label")?.getAttribute("y")).toBe("88");
  });

  it("opens a level once when the SVG band is activated by keyboard", async () => {
    const pyramid = document.createElement("bird-pyramid") as BirdPyramid;
    pyramid.model = MODELS["bird-classic"];
    const listener = vi.fn();
    pyramid.addEventListener("level-detail", listener);
    document.body.append(pyramid);
    await pyramid.updateComplete;
    const level = pyramid.querySelector<SVGGElement>(".pyramid__level");
    expect(level).not.toBeNull();

    // SVG groups handle their own keyboard activation (no synthetic click).
    fireEvent.keyDown(level!, { key: "Enter" });

    expect(listener).toHaveBeenCalledOnce();
  });

  it("opens a level on click", async () => {
    const pyramid = document.createElement("bird-pyramid") as BirdPyramid;
    pyramid.model = MODELS["bird-classic"];
    const listener = vi.fn();
    pyramid.addEventListener("level-detail", listener);
    document.body.append(pyramid);
    await pyramid.updateComplete;
    const level = pyramid.querySelector<SVGGElement>(".pyramid__level");
    expect(level).not.toBeNull();

    fireEvent.click(level!);

    expect(listener).toHaveBeenCalledOnce();
  });
});
