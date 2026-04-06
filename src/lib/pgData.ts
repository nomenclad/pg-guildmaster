import { db } from "./db";
import bundledRecipes from "@/data/pg-recipes.json";

export interface PgRecipe {
  Name: string | null;
  IconId: number | null;
  Skill: string | null;
}

const CDN_VERSION_DEFAULT = "458";
const FILEVERSION_URL = "https://client.projectgorgon.com/fileversion.txt";
const RECIPES_SETTING_KEY = "pgRecipesJson";
const CDN_VERSION_KEY = "pgCdnVersion";
const CDN_UPDATED_KEY = "pgCdnUpdatedAt";

let runtimeCache: Record<string, PgRecipe> | null = null;
let iconBase: string | null = null;

async function getCdnVersion(): Promise<string> {
  try {
    const r = await fetch(FILEVERSION_URL);
    if (!r.ok) throw new Error("failed");
    const v = (await r.text()).trim();
    return v || CDN_VERSION_DEFAULT;
  } catch {
    return CDN_VERSION_DEFAULT;
  }
}

/**
 * Returns the recipe lookup, preferring runtime-fetched data (stored in
 * IndexedDB) over the build-time bundle.
 */
export async function getRecipeLookup(): Promise<Record<string, PgRecipe>> {
  if (runtimeCache) return runtimeCache;

  // Try IndexedDB first (user-fetched data)
  const stored = await db.settings.get(RECIPES_SETTING_KEY);
  if (stored) {
    try {
      runtimeCache = JSON.parse(stored.value) as Record<string, PgRecipe>;
      return runtimeCache;
    } catch { /* fall through */ }
  }

  // Fall back to build-time bundle
  const bundled = bundledRecipes as Record<string, PgRecipe>;
  if (Object.keys(bundled).length > 0) {
    runtimeCache = bundled;
    return runtimeCache;
  }

  return {};
}

/**
 * Fetch fresh recipe data from the PG CDN and store in IndexedDB.
 * Returns the count of recipes fetched.
 */
export async function refreshFromCdn(): Promise<{ recipeCount: number; version: string }> {
  const version = await getCdnVersion();
  const url = `https://cdn.projectgorgon.com/v${version}/data/recipes.json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`CDN returned HTTP ${res.status}`);

  const raw = await res.json();

  // Extract only needed fields
  const slim: Record<string, PgRecipe> = {};
  for (const [key, recipe] of Object.entries(raw)) {
    const r = recipe as Record<string, unknown>;
    slim[key] = {
      Name: (r.Name as string) || null,
      IconId: (r.IconId as number) ?? null,
      Skill: (r.Skill as string) || null,
    };
  }

  // Store in IndexedDB
  const json = JSON.stringify(slim);
  await db.settings.bulkPut([
    { key: RECIPES_SETTING_KEY, value: json },
    { key: CDN_VERSION_KEY, value: version },
    { key: CDN_UPDATED_KEY, value: new Date().toISOString() },
  ]);

  // Update runtime cache and icon base
  runtimeCache = slim;
  iconBase = `https://cdn.projectgorgon.com/v${version}/icons`;

  return { recipeCount: Object.keys(slim).length, version };
}

/** Returns when the CDN data was last fetched, or null if never. */
export async function getCdnStatus(): Promise<{
  updatedAt: string | null;
  version: string | null;
  recipeCount: number;
}> {
  const [updatedRow, versionRow, storedData] = await Promise.all([
    db.settings.get(CDN_UPDATED_KEY),
    db.settings.get(CDN_VERSION_KEY),
    db.settings.get(RECIPES_SETTING_KEY),
  ]);

  let recipeCount = 0;
  if (storedData) {
    try {
      recipeCount = Object.keys(JSON.parse(storedData.value)).length;
    } catch { /* ignore */ }
  } else {
    recipeCount = Object.keys(bundledRecipes).length;
  }

  return {
    updatedAt: updatedRow?.value ?? null,
    version: versionRow?.value ?? null,
    recipeCount,
  };
}

export function getIconUrl(iconId: number): string {
  const base = iconBase ?? `https://cdn.projectgorgon.com/v${CDN_VERSION_DEFAULT}/icons`;
  return `${base}/icon_${iconId}.png`;
}
