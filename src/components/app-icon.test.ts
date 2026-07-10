import { render } from "lit";
import { describe, expect, it } from "vitest";

import { icon } from "./app-icon";

describe("app icons", () => {
  it("renders glyph primitives in the SVG namespace so browsers paint them", () => {
    const container = document.createElement("div");

    render(icon("target"), container);

    expect(container.querySelector("circle")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });
});
