#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const projectRoot = resolve(import.meta.dirname, "..");

export function versionCode(versionName) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(versionName);
  if (!match) {
    throw new Error("La versión debe usar el formato numérico X.Y.Z.");
  }
  const [, major, minor, patch] = match;
  if (Number(minor) > 99 || Number(patch) > 99) {
    throw new Error("Los componentes minor y patch no pueden superar 99.");
  }
  const code = Number(major) * 1_000_000 + Number(minor) * 10_000 + Number(patch) * 100;
  if (!Number.isSafeInteger(code) || code <= 0 || code > 2_100_000_000) {
    throw new Error("La versión produce un versionCode fuera del rango admitido.");
  }
  return code;
}

async function packageVersion() {
  const metadata = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8"));
  return metadata.version;
}

export async function main(argv = process.argv.slice(2)) {
  const [command = "name", explicitVersion] = argv;
  const name = explicitVersion ?? (await packageVersion());
  if (command === "name") {
    globalThis.console.log(name);
    return;
  }
  if (command === "code") {
    globalThis.console.log(versionCode(name));
    return;
  }
  throw new Error(`Comando de versión desconocido: ${command}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch((error) => {
    globalThis.console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}
