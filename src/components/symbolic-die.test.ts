import { afterEach, describe, expect, it } from "vitest";

import type { SymbolicDie } from "./symbolic-die";
import "./symbolic-die";

afterEach(() => document.body.replaceChildren());

describe("symbolic die", () => {
  it("renders six accident-symbol faces with an accessible current result", async () => {
    const die = document.createElement("symbolic-die") as SymbolicDie;
    die.outcome = "serious-injury";
    document.body.append(die);
    await die.updateComplete;

    expect(die.querySelectorAll(".symbolic-die__face")).toHaveLength(6);
    expect(die.querySelectorAll(".symbolic-die__face .app-icon")).toHaveLength(6);
    expect(die.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe(
      "Dado simbólico: Lesión grave",
    );
  });
});
