import assert from "node:assert/strict";
import test from "node:test";

// Kept outside Vitest's *.test.* pattern because these tests exercise a Node CLI module.
import {
  parseArguments,
  parseGoogleGroups,
  productionRelease,
  readListingFromMarkdown,
  validateListing,
} from "./play-publisher.mjs";
import { versionCode } from "./version.mjs";

test("parsea comandos y exige valores para las opciones", () => {
  assert.deepEqual(parseArguments(["upload-internal", "--aab", "app.aab", "--commit"]), {
    command: "upload-internal",
    options: { aab: "app.aab", commit: true },
  });
  assert.throws(() => parseArguments(["upload-internal", "--aab"]), /Falta el valor/);
  assert.deepEqual(parseArguments(["upload-closed", "--aab", "app.aab", "--commit"]), {
    command: "upload-closed",
    options: { aab: "app.aab", commit: true },
  });
});

test("extrae la ficha española del Markdown mantenible", () => {
  const listing = readListingFromMarkdown(`
## Nombre de la aplicación

Pirámide de Bird

## Descripción breve

Aprende prevención.

## Descripción completa

Texto completo.

Segundo párrafo.

## Texto alternativo de los recursos

No forma parte de la ficha.
`);
  assert.deepEqual(listing, {
    title: "Pirámide de Bird",
    shortDescription: "Aprende prevención.",
    fullDescription: "Texto completo.\n\nSegundo párrafo.",
  });
  assert.doesNotThrow(() => validateListing(listing));
});

test("rechaza una ficha que supera los límites de Play", () => {
  assert.throws(
    () =>
      validateListing({
        title: "x".repeat(31),
        shortDescription: "Breve",
        fullDescription: "Completa",
      }),
    /title supera/,
  );
});

test("normaliza grupos de prueba sin duplicados", () => {
  assert.deepEqual(parseGoogleGroups("equipo@example.com, equipo@example.com\nprl@example.org"), [
    "equipo@example.com",
    "prl@example.org",
  ]);
  assert.throws(() => parseGoogleGroups("persona-sin-correo"), /no válido/);
  assert.throws(() => parseGoogleGroups(""), /al menos un correo/);
});

test("solo aplica userFraction a despliegues parciales", () => {
  const notes = [{ language: "es-ES", text: "Notas" }];
  assert.deepEqual(productionRelease("10", "0.1", notes, "Versión 10"), {
    name: "Versión 10",
    versionCodes: ["10"],
    releaseNotes: notes,
    status: "inProgress",
    userFraction: 0.1,
  });
  assert.deepEqual(productionRelease("10", "1", notes, "Versión 10"), {
    name: "Versión 10",
    versionCodes: ["10"],
    releaseNotes: notes,
    status: "completed",
  });
  assert.throws(() => productionRelease("10", "0", notes, "Versión 10"), /fracción/);
});

test("deriva un versionCode monotónico desde la versión semántica", () => {
  assert.equal(versionCode("1.0.1"), 1_000_100);
  assert.equal(versionCode("1.1.0"), 1_010_000);
  assert.equal(versionCode("2.0.0"), 2_000_000);
  assert.throws(() => versionCode("1.0.1-beta"), /formato numérico/);
  assert.throws(() => versionCode("1.0.100"), /no pueden superar 99/);
});
