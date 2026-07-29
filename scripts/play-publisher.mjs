#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import process from "node:process";

const API_ROOT = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const UPLOAD_ROOT = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3";
const DEFAULT_PACKAGE_NAME = "com.breixopd.piramidebird";
const DEFAULT_LANGUAGE = "es-ES";
const projectRoot = resolve(import.meta.dirname, "..");

export function parseArguments(argv) {
  const [command = "check", ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith("--")) {
      throw new Error(`Argumento inesperado: ${item}`);
    }

    const key = item.slice(2);
    if (key === "commit") {
      options.commit = true;
      continue;
    }

    const value = rest[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Falta el valor de --${key}`);
    }
    options[key] = value;
    index += 1;
  }

  return { command, options };
}

export function extractMarkdownSection(markdown, heading) {
  const marker = `## ${heading}`;
  const markerIndex = markdown.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`No se encontró la sección "${heading}" en la ficha.`);
  }
  const contentStart = markdown.indexOf("\n", markerIndex + marker.length);
  const nextHeading = markdown.indexOf("\n## ", contentStart + 1);
  return markdown.slice(contentStart + 1, nextHeading < 0 ? undefined : nextHeading).trim();
}

export function readListingFromMarkdown(markdown) {
  return {
    title: extractMarkdownSection(markdown, "Nombre de la aplicación"),
    shortDescription: extractMarkdownSection(markdown, "Descripción breve"),
    fullDescription: extractMarkdownSection(markdown, "Descripción completa"),
  };
}

export function validateListing(listing) {
  const limits = {
    title: 30,
    shortDescription: 80,
    fullDescription: 4000,
  };

  for (const [field, limit] of Object.entries(limits)) {
    const value = listing[field]?.trim();
    if (!value) {
      throw new Error(`La ficha no contiene ${field}.`);
    }
    if ([...value].length > limit) {
      throw new Error(`${field} supera el límite de ${limit} caracteres.`);
    }
  }
}

export function parseGoogleGroups(rawGroups) {
  const groups = [
    ...new Set(
      rawGroups
        .split(/[,\n]/)
        .map((group) => group.trim())
        .filter(Boolean),
    ),
  ];
  for (const group of groups) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(group)) {
      throw new Error(`Grupo de Google no válido: ${group}`);
    }
  }
  if (groups.length === 0) {
    throw new Error("Debes indicar al menos un correo de Google Group.");
  }
  return groups;
}

export function productionRelease(versionCode, fraction, releaseNotes, releaseName) {
  const parsedFraction = Number(fraction);
  if (!Number.isFinite(parsedFraction) || parsedFraction <= 0 || parsedFraction > 1) {
    throw new Error("La fracción de producción debe ser mayor que 0 y menor o igual que 1.");
  }

  const release = {
    name: releaseName,
    versionCodes: [String(versionCode)],
    releaseNotes,
    status: parsedFraction === 1 ? "completed" : "inProgress",
  };
  if (parsedFraction < 1) {
    release.userFraction = parsedFraction;
  }
  return release;
}

function requireOption(options, name) {
  const value = options[name]?.trim();
  if (!value) {
    throw new Error(`Falta el argumento obligatorio --${name}.`);
  }
  return value;
}

function requireConfirmation(environmentName, expected) {
  if (process.env[environmentName] !== expected) {
    throw new Error(
      `Confirmación rechazada: ${environmentName} debe contener exactamente ${expected}.`,
    );
  }
}

async function ensureFile(filePath, description) {
  let details;
  try {
    details = await stat(filePath);
  } catch {
    throw new Error(`No existe ${description}: ${filePath}`);
  }
  if (!details.isFile() || details.size === 0) {
    throw new Error(`${description} está vacío o no es un archivo: ${filePath}`);
  }
}

async function loadReleaseNotes() {
  const notesPath = resolve(projectRoot, "distribution/play/release-notes/es-ES.txt");
  await ensureFile(notesPath, "las notas de versión");
  const text = (await readFile(notesPath, "utf8")).trim();
  if ([...text].length > 500) {
    throw new Error("Las notas de versión superan los 500 caracteres.");
  }
  return [{ language: DEFAULT_LANGUAGE, text }];
}

async function loadListing() {
  const listingPath = resolve(projectRoot, "store-listing/listing-es.md");
  const listing = readListingFromMarkdown(await readFile(listingPath, "utf8"));
  validateListing(listing);
  return listing;
}

async function loadListingImages() {
  const phoneDirectory = resolve(projectRoot, "store-listing/phone");
  const phoneScreenshots = (await readdir(phoneDirectory))
    .filter((filename) => extname(filename).toLowerCase() === ".png")
    .sort()
    .map((filename) => resolve(phoneDirectory, filename));

  if (phoneScreenshots.length < 2 || phoneScreenshots.length > 8) {
    throw new Error("Google Play requiere entre 2 y 8 capturas de teléfono.");
  }

  const images = {
    icon: [resolve(projectRoot, "store-listing/app-icon.png")],
    featureGraphic: [resolve(projectRoot, "store-listing/feature-graphic.png")],
    phoneScreenshots,
  };

  for (const [imageType, paths] of Object.entries(images)) {
    for (const imagePath of paths) {
      await ensureFile(imagePath, `la imagen ${imageType}`);
    }
  }
  return images;
}

function packageName(options) {
  return options.package ?? process.env.PLAY_PACKAGE_NAME ?? DEFAULT_PACKAGE_NAME;
}

function accessToken() {
  const token = process.env.GOOGLE_OAUTH_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("Falta GOOGLE_OAUTH_ACCESS_TOKEN para acceder a Google Play.");
  }
  return token;
}

async function apiRequest(path, { method = "GET", body, mediaType } = {}) {
  const headers = {
    Authorization: `Bearer ${accessToken()}`,
  };
  if (body !== undefined && !mediaType) {
    headers["Content-Type"] = "application/json; charset=utf-8";
  }
  if (mediaType) {
    headers["Content-Type"] = mediaType;
  }

  const response = await globalThis.fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : mediaType ? body : JSON.stringify(body),
    signal: globalThis.AbortSignal.timeout(180_000),
  });
  const responseText = await response.text();
  const responseBody = responseText ? JSON.parse(responseText) : undefined;
  if (!response.ok) {
    const message = responseBody?.error?.message ?? `${response.status} ${response.statusText}`;
    throw new Error(`Google Play rechazó la solicitud (${response.status}): ${message}`);
  }
  return responseBody;
}

function appPath(name) {
  return encodeURIComponent(name);
}

async function insertEdit(name) {
  return apiRequest(`${API_ROOT}/applications/${appPath(name)}/edits`, {
    method: "POST",
    body: {},
  });
}

async function deleteEdit(name, editId) {
  await apiRequest(`${API_ROOT}/applications/${appPath(name)}/edits/${editId}`, {
    method: "DELETE",
  });
}

async function withCommittedEdit(name, operation) {
  const edit = await insertEdit(name);
  let committed = false;
  try {
    const result = await operation(edit.id);
    await apiRequest(`${API_ROOT}/applications/${appPath(name)}/edits/${edit.id}:validate`, {
      method: "POST",
      body: {},
    });
    await apiRequest(`${API_ROOT}/applications/${appPath(name)}/edits/${edit.id}:commit`, {
      method: "POST",
      body: {},
    });
    committed = true;
    return result;
  } finally {
    if (!committed) {
      try {
        await deleteEdit(name, edit.id);
      } catch (error) {
        globalThis.console.error(
          `Aviso: no se pudo descartar el edit ${edit.id}: ${error.message}`,
        );
      }
    }
  }
}

async function updateTrack(name, editId, track, releases) {
  return apiRequest(
    `${API_ROOT}/applications/${appPath(name)}/edits/${editId}/tracks/${encodeURIComponent(track)}`,
    {
      method: "PUT",
      body: { track, releases },
    },
  );
}

async function uploadBundle(name, editId, aabPath) {
  return apiRequest(
    `${UPLOAD_ROOT}/applications/${appPath(name)}/edits/${editId}/bundles?uploadType=media`,
    {
      method: "POST",
      body: await readFile(aabPath),
      mediaType: "application/octet-stream",
    },
  );
}

async function updateListing(name, editId, listing) {
  return apiRequest(
    `${API_ROOT}/applications/${appPath(name)}/edits/${editId}/listings/${DEFAULT_LANGUAGE}`,
    {
      method: "PUT",
      body: { language: DEFAULT_LANGUAGE, ...listing },
    },
  );
}

async function replaceImages(name, editId, imageType, imagePaths) {
  const basePath = `${API_ROOT}/applications/${appPath(name)}/edits/${editId}/listings/${DEFAULT_LANGUAGE}/${imageType}`;
  await apiRequest(basePath, { method: "DELETE" });
  for (const imagePath of imagePaths) {
    await apiRequest(
      `${UPLOAD_ROOT}/applications/${appPath(name)}/edits/${editId}/listings/${DEFAULT_LANGUAGE}/${imageType}?uploadType=media`,
      {
        method: "POST",
        body: await readFile(imagePath),
        mediaType: "image/png",
      },
    );
  }
}

async function updateTesters(name, editId, track, googleGroups) {
  return apiRequest(
    `${API_ROOT}/applications/${appPath(name)}/edits/${editId}/testers/${encodeURIComponent(track)}`,
    {
      method: "PUT",
      body: { googleGroups },
    },
  );
}

async function checkProject(options) {
  const listing = await loadListing();
  const images = await loadListingImages();
  const releaseNotes = await loadReleaseNotes();
  const result = {
    packageName: packageName(options),
    listing: {
      titleCharacters: [...listing.title].length,
      shortDescriptionCharacters: [...listing.shortDescription].length,
      fullDescriptionCharacters: [...listing.fullDescription].length,
    },
    images: Object.fromEntries(
      Object.entries(images).map(([type, paths]) => [type, paths.map((path) => basename(path))]),
    ),
    releaseNotesCharacters: [...releaseNotes[0].text].length,
  };
  globalThis.console.log(JSON.stringify(result, null, 2));
}

async function checkAccess(options) {
  const name = packageName(options);
  await apiRequest(`${API_ROOT}/applications/${appPath(name)}/reviews?maxResults=1`);
  globalThis.console.log(`Acceso de lectura confirmado para ${name}.`);
}

async function uploadInternal(options) {
  return uploadTestingTrack(options, {
    track: "internal",
    confirmationEnvironment: "PLAY_INTERNAL_CONFIRMATION",
    expectedConfirmation: "UPLOAD_INTERNAL",
  });
}

async function uploadClosed(options) {
  return uploadTestingTrack(options, {
    track: "alpha",
    confirmationEnvironment: "PLAY_CLOSED_CONFIRMATION",
    expectedConfirmation: "UPLOAD_CLOSED",
  });
}

async function uploadTestingTrack(
  options,
  { track, confirmationEnvironment, expectedConfirmation },
) {
  const aabPath = resolve(requireOption(options, "aab"));
  await ensureFile(aabPath, "el Android App Bundle");
  const releaseNotes = await loadReleaseNotes();
  const name = packageName(options);

  if (!options.commit) {
    globalThis.console.log(
      `Plan validado: subir ${basename(aabPath)} a la pista ${track} de ${name}.`,
    );
    return;
  }

  requireConfirmation(confirmationEnvironment, expectedConfirmation);
  const result = await withCommittedEdit(name, async (editId) => {
    const bundle = await uploadBundle(name, editId, aabPath);
    await updateTrack(name, editId, track, [
      {
        name: options["release-name"] ?? `Versión ${bundle.versionCode}`,
        versionCodes: [String(bundle.versionCode)],
        releaseNotes,
        status: "completed",
      },
    ]);
    return { versionCode: String(bundle.versionCode) };
  });
  globalThis.console.log(`Versión ${result.versionCode} publicada en la pista ${track}.`);
}

async function promoteProduction(options) {
  const versionCode = requireOption(options, "version-code");
  if (!/^\d+$/.test(versionCode)) {
    throw new Error("--version-code debe ser un número entero positivo.");
  }
  const fraction = requireOption(options, "fraction");
  const releaseNotes = await loadReleaseNotes();
  const release = productionRelease(
    versionCode,
    fraction,
    releaseNotes,
    options["release-name"] ?? `Versión ${versionCode}`,
  );
  const name = packageName(options);

  if (!options.commit) {
    globalThis.console.log(
      `Plan validado: promover ${versionCode} a production con estado ${release.status}` +
        (release.userFraction ? ` y fracción ${release.userFraction}` : "") +
        ".",
    );
    return;
  }

  requireConfirmation("PLAY_PRODUCTION_CONFIRMATION", `PROMOTE_VERSION_${versionCode}`);
  await withCommittedEdit(name, (editId) => updateTrack(name, editId, "production", [release]));
  globalThis.console.log(
    `Versión ${versionCode} promovida a production con estado ${release.status}.`,
  );
}

async function syncListing(options) {
  const listing = await loadListing();
  const images = await loadListingImages();
  const name = packageName(options);

  if (!options.commit) {
    globalThis.console.log(
      `Plan validado: sincronizar ficha ${DEFAULT_LANGUAGE}, ${images.phoneScreenshots.length} capturas, icono y gráfico destacado.`,
    );
    return;
  }

  requireConfirmation("PLAY_LISTING_CONFIRMATION", "SYNC_LISTING");
  await withCommittedEdit(name, async (editId) => {
    await updateListing(name, editId, listing);
    for (const [imageType, imagePaths] of Object.entries(images)) {
      await replaceImages(name, editId, imageType, imagePaths);
    }
  });
  globalThis.console.log(`Ficha ${DEFAULT_LANGUAGE} sincronizada.`);
}

async function syncTesters(options) {
  const track = options.track ?? "internal";
  if (!["internal", "alpha", "beta"].includes(track) && !track.startsWith("closed")) {
    throw new Error("La automatización de testers solo admite internal o pistas de pruebas.");
  }
  const rawGroups = options.groups ?? process.env.PLAY_TESTER_GOOGLE_GROUPS ?? "";
  const googleGroups = parseGoogleGroups(rawGroups);
  const name = packageName(options);

  if (!options.commit) {
    globalThis.console.log(
      `Plan validado: asignar ${googleGroups.length} Google Group a la pista ${track}.`,
    );
    return;
  }

  requireConfirmation("PLAY_TESTERS_CONFIRMATION", "SYNC_TESTERS");
  await withCommittedEdit(name, (editId) => updateTesters(name, editId, track, googleGroups));
  globalThis.console.log(
    `Testers de ${track} sincronizados con ${googleGroups.length} Google Group.`,
  );
}

export async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArguments(argv);
  switch (command) {
    case "check":
      await checkProject(options);
      break;
    case "access":
      await checkAccess(options);
      break;
    case "upload-internal":
      await uploadInternal(options);
      break;
    case "upload-closed":
      await uploadClosed(options);
      break;
    case "promote-production":
      await promoteProduction(options);
      break;
    case "sync-listing":
      await syncListing(options);
      break;
    case "sync-testers":
      await syncTesters(options);
      break;
    default:
      throw new Error(`Comando desconocido: ${command}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch((error) => {
    globalThis.console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}
