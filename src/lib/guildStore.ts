import { db } from "./db";
import { parseCharacterJson } from "./parser";
import { getRecipeLookup } from "@/lib/pgData";
import type { CharacterRow, SkillSummaryEntry, RecipeEntry } from "@/types/character";

/** Crafting / trade skills in Project Gorgon. Only these appear in the skill summary. */
const CRAFTING_SKILLS = new Set([
  "Alchemy",
  "Armor Patching",
  "Brewing",
  "Butchering",
  "Calligraphy",
  "Carpentry",
  "Cheesemaking",
  "Cooking",
  "Dying",
  "First Aid",
  "Fletching",
  "Flower Arrangement",
  "Gardening",
  "Leatherworking",
  "Lore",
  "Mycology",
  "Sigil Scripting",
  "Skinning",
  "Tailoring",
  "Tanning",
  "Toolcrafting",
  "Transmutation",
]);

export async function getCharacters(): Promise<CharacterRow[]> {
  const all = await db.characters.toArray();
  return all.map((c) => ({
    id: c.id,
    name: c.name,
    server: c.server,
    uploadedAt: c.uploadedAt,
  }));
}

export async function uploadCharacter(file: File): Promise<{
  name: string;
  server: string;
  skillCount: number;
  recipeCount: number;
}> {
  const raw = await file.text();
  const parsed = parseCharacterJson(raw, file.name);
  const server = parsed.server || null;

  return await db.transaction("rw", db.characters, db.characterSkills, db.characterRecipes, async () => {
    // Check for existing character (upsert)
    const existing = await db.characters
      .where("[name+server]")
      .equals([parsed.name, server as string])
      .first();

    let characterId: number;

    if (existing) {
      await db.characters.update(existing.id, {
        rawJson: raw,
        uploadedAt: new Date().toISOString(),
        server,
      });
      characterId = existing.id;

      // Delete old skills and recipes
      await db.characterSkills.where("characterId").equals(characterId).delete();
      await db.characterRecipes.where("characterId").equals(characterId).delete();
    } else {
      characterId = await db.characters.add({
        name: parsed.name,
        server,
        uploadedAt: new Date().toISOString(),
        rawJson: raw,
      } as never) as number;
    }

    // Insert skills
    if (parsed.skills.length > 0) {
      await db.characterSkills.bulkAdd(
        parsed.skills.map((s) => ({
          characterId,
          skillName: s.name,
          level: s.level,
          xpEarned: s.xp ?? null,
        } as never))
      );
    }

    // Insert recipes
    if (parsed.recipes.length > 0) {
      await db.characterRecipes.bulkAdd(
        parsed.recipes.map((r) => ({
          characterId,
          recipeName: r.name,
          skillName: r.skill ?? null,
        } as never))
      );
    }

    return {
      name: parsed.name,
      server: parsed.server,
      skillCount: parsed.skills.length,
      recipeCount: parsed.recipes.length,
    };
  });
}

export async function deleteCharacter(id: number): Promise<void> {
  await db.transaction("rw", db.characters, db.characterSkills, db.characterRecipes, async () => {
    await db.characterSkills.where("characterId").equals(id).delete();
    await db.characterRecipes.where("characterId").equals(id).delete();
    await db.characters.delete(id);
  });
}

export async function getSkillSummary(): Promise<{
  skillNames: string[];
  entries: SkillSummaryEntry[];
}> {
  const allCharacters = await db.characters.toArray();
  const allSkills = await db.characterSkills.toArray();

  const allSkillNames = new Set<string>();
  const skillsByCharId = new Map<number, Record<string, number>>();

  for (const s of allSkills) {
    if (!CRAFTING_SKILLS.has(s.skillName)) continue;
    allSkillNames.add(s.skillName);
    if (!skillsByCharId.has(s.characterId)) {
      skillsByCharId.set(s.characterId, {});
    }
    skillsByCharId.get(s.characterId)![s.skillName] = s.level;
  }

  const entries: SkillSummaryEntry[] = allCharacters.map((char) => ({
    characterName: char.name,
    skills: skillsByCharId.get(char.id) ?? {},
  }));

  return {
    skillNames: Array.from(allSkillNames).sort(),
    entries,
  };
}

export async function getRecipes(skillFilter?: string | null): Promise<{
  recipes: RecipeEntry[];
  skills: string[];
}> {
  const [allCharacters, allRecipes, lookup] = await Promise.all([
    db.characters.toArray(),
    db.characterRecipes.toArray(),
    getRecipeLookup(),
  ]);

  const charNameById = new Map<number, string>();
  for (const c of allCharacters) {
    charNameById.set(c.id, c.name);
  }

  const allSkills = new Set<string>();
  const recipeMap = new Map<string, RecipeEntry>();

  for (const row of allRecipes) {
    // Resolve display name and icon from CDN data
    const pgRecipe = lookup[row.recipeName];
    const displayName = pgRecipe?.Name ?? formatFallbackName(row.recipeName);
    const skill = pgRecipe?.Skill ?? row.skillName;
    const iconId = pgRecipe?.IconId ?? null;

    if (skill) allSkills.add(skill);

    // Apply skill filter if provided
    if (skillFilter && skill !== skillFilter) continue;

    const key = row.recipeName;
    if (!recipeMap.has(key)) {
      recipeMap.set(key, {
        recipeName: displayName,
        recipeKey: row.recipeName,
        skill,
        iconId,
        knownBy: [],
      });
    }
    const charName = charNameById.get(row.characterId);
    if (charName) {
      recipeMap.get(key)!.knownBy.push(charName);
    }
  }

  const recipes = Array.from(recipeMap.values()).sort((a, b) =>
    a.recipeName.localeCompare(b.recipeName)
  );

  return {
    recipes,
    skills: Array.from(allSkills).sort(),
  };
}

// --- Admin password ---

const ADMIN_PW_KEY = "adminPasswordHash";

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hasAdminPassword(): Promise<boolean> {
  const row = await db.settings.get(ADMIN_PW_KEY);
  return !!row;
}

export async function setAdminPassword(password: string): Promise<void> {
  const hash = await hashPassword(password);
  await db.settings.put({ key: ADMIN_PW_KEY, value: hash });
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const row = await db.settings.get(ADMIN_PW_KEY);
  if (!row) return false;
  const hash = await hashPassword(password);
  return hash === row.value;
}

/**
 * Best-effort display name when CDN data is unavailable.
 * "recipe_7043"                   → "Recipe #7043"
 * "Recipe_Cooking_CheeseOmelet"   → "Cheese Omelet"
 */
function formatFallbackName(raw: string): string {
  // Numeric ID format: recipe_1234
  const numMatch = raw.match(/^recipe_(\d+)$/i);
  if (numMatch) return `Recipe #${numMatch[1]}`;

  const parts = raw.split("_");
  // Strip leading "recipe" prefix and skill name
  const meaningful = parts.filter(
    (p, i) => !(i === 0 && p.toLowerCase() === "recipe") && !(i === 1 && CRAFTING_SKILLS.has(p))
  );
  if (meaningful.length === 0) return raw;
  // Split PascalCase words
  return meaningful
    .map((p) => p.replace(/([a-z])([A-Z])/g, "$1 $2"))
    .join(" ");
}
