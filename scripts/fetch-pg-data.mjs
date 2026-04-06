#!/usr/bin/env node

/**
 * Pre-build script: fetches Project Gorgon recipe data from the CDN
 * and writes a local JSON file so the app doesn't need runtime CORS access.
 *
 * If the CDN is unreachable (e.g. sandbox/CI without internet), falls back
 * to an empty file so the build still succeeds.
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "data");
const OUT_FILE = join(OUT_DIR, "pg-recipes.json");

const FILEVERSION_URL = "https://client.projectgorgon.com/fileversion.txt";
const CDN_VERSION_DEFAULT = "458";

async function getCdnVersion() {
  try {
    const r = await fetch(FILEVERSION_URL);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const t = await r.text();
    return t.trim() || CDN_VERSION_DEFAULT;
  } catch (e) {
    console.warn(`Could not fetch CDN version, using default v${CDN_VERSION_DEFAULT}: ${e.message}`);
    return CDN_VERSION_DEFAULT;
  }
}

function writeEmpty() {
  mkdirSync(OUT_DIR, { recursive: true });
  if (!existsSync(OUT_FILE)) {
    writeFileSync(OUT_FILE, "{}");
    console.log("Wrote empty pg-recipes.json (CDN unavailable)");
  } else {
    console.log("Keeping existing pg-recipes.json (CDN unavailable)");
  }
}

async function main() {
  const version = await getCdnVersion();
  console.log(`PG CDN version: v${version}`);

  const url = `https://cdn.projectgorgon.com/v${version}/data/recipes.json`;
  console.log(`Fetching ${url} ...`);

  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    console.warn(`Network error: ${e.message}`);
    writeEmpty();
    return;
  }

  if (!res.ok) {
    console.warn(`HTTP ${res.status} from CDN`);
    writeEmpty();
    return;
  }

  const raw = await res.json();

  // Extract only the fields we need to keep bundle size small
  const slim = {};
  for (const [key, recipe] of Object.entries(raw)) {
    slim[key] = {
      Name: recipe.Name || null,
      IconId: recipe.IconId ?? null,
      Skill: recipe.Skill || null,
    };
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(slim));

  const count = Object.keys(slim).length;
  const sizeKB = (Buffer.byteLength(JSON.stringify(slim)) / 1024).toFixed(0);
  console.log(`Wrote ${count} recipes (${sizeKB} KB) to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error("Warning: fetch-pg-data failed:", e.message);
  writeEmpty();
});
