import pgRecipes from "@/data/pg-recipes.json";

export interface PgRecipe {
  Name: string | null;
  IconId: number | null;
  Skill: string | null;
}

const CDN_VERSION_DEFAULT = "458";
const FILEVERSION_URL = "https://client.projectgorgon.com/fileversion.txt";

let iconBase: string | null = null;

/** Returns the bundled recipe lookup (keyed by e.g. "recipe_7043") */
export function getRecipeLookup(): Record<string, PgRecipe> {
  return pgRecipes as Record<string, PgRecipe>;
}

async function resolveIconBase(): Promise<string> {
  if (iconBase) return iconBase;
  try {
    const r = await fetch(FILEVERSION_URL);
    if (!r.ok) throw new Error("failed");
    const v = (await r.text()).trim() || CDN_VERSION_DEFAULT;
    iconBase = `https://cdn.projectgorgon.com/v${v}/icons`;
  } catch {
    iconBase = `https://cdn.projectgorgon.com/v${CDN_VERSION_DEFAULT}/icons`;
  }
  return iconBase;
}

let iconBasePromise: Promise<string> | null = null;

export function getIconUrl(iconId: number): string {
  // Start resolving the version in the background on first call
  if (!iconBasePromise) {
    iconBasePromise = resolveIconBase();
  }
  // Use the resolved base if available, otherwise fallback
  const base = iconBase ?? `https://cdn.projectgorgon.com/v${CDN_VERSION_DEFAULT}/icons`;
  return `${base}/icon_${iconId}.png`;
}
