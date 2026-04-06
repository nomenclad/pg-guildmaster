const FILEVERSION_URL = "https://client.projectgorgon.com/fileversion.txt";
const CDN_VERSION_DEFAULT = "458";

let cdnVersion: string | null = null;

async function getCdnVersion(): Promise<string> {
  if (cdnVersion) return cdnVersion;
  try {
    const r = await fetch(FILEVERSION_URL);
    if (!r.ok) throw new Error("failed");
    const t = await r.text();
    cdnVersion = t.trim() || CDN_VERSION_DEFAULT;
  } catch {
    cdnVersion = CDN_VERSION_DEFAULT;
  }
  return cdnVersion;
}

function cdnDataUrl(version: string): string {
  return `https://cdn.projectgorgon.com/v${version}/data`;
}

function cdnIconsUrl(version: string): string {
  return `https://cdn.projectgorgon.com/v${version}/icons`;
}

export interface PgRecipe {
  Name?: string;
  InternalName?: string;
  IconId?: number;
  Skill?: string;
  SkillLevelReq?: number;
  Description?: string;
}

/** Map from recipe key (e.g. "recipe_7043") to PgRecipe */
let recipesCache: Record<string, PgRecipe> | null = null;
let iconBase: string | null = null;

export async function loadRecipeLookup(): Promise<Record<string, PgRecipe>> {
  if (recipesCache) return recipesCache;

  const version = await getCdnVersion();
  iconBase = cdnIconsUrl(version);

  try {
    const res = await fetch(`${cdnDataUrl(version)}/recipes.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    recipesCache = (await res.json()) as Record<string, PgRecipe>;
  } catch {
    // Fallback: empty lookup — display raw names
    recipesCache = {};
  }

  return recipesCache;
}

export function getIconUrl(iconId: number): string {
  const base = iconBase ?? `https://cdn.projectgorgon.com/v${CDN_VERSION_DEFAULT}/icons`;
  return `${base}/icon_${iconId}.png`;
}
