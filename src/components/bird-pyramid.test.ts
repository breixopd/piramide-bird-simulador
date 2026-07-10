import { fireEvent } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MODELS } from "../domain/models";
import type { BirdPyramid } from "./bird-pyramid";
import "./bird-pyramid";

afterEach(() => {
  document.body.replaceChildren();
});

describe("bird pyramid keyboard interaction", () => {
  it("opens a level once when Enter produces its native button click", async () => {
    const pyramid = document.createElement("bird-pyramid") as BirdPyramid;
    pyramid.model = MODELS["bird-classic"];
    const listener = vi.fn();
    pyramid.addEventListener("level-detail", listener);
    document.body.append(pyramid);
    await pyramid.updateComplete;
    const level = pyramid.querySelector<HTMLButtonElement>(".pyramid__level");
    expect(level).not.toBeNull();

    fireEvent.keyDown(level!, { key: "Enter" });
    fireEvent.click(level!);

    expect(listener).toHaveBeenCalledOnce();
  });
});
