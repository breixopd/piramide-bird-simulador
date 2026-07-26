import { fireEvent } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MODELS } from "../domain/models";
import type { BirdPyramid } from "./bird-pyramid";
import "./bird-pyramid";

afterEach(() => {
  document.body.replaceChildren();
});

describe("bird pyramid interaction", () => {
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
