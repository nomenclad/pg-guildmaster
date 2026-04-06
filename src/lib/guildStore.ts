import { db } from "./db";
import { parseCharacterJson } from "./parser";
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
  const allCharacters = await db.characters.toArray();
  const allRecipes = await db.characterRecipes.toArray();

  const charNameById = new Map<number, string>();
  for (const c of allCharacters) {
    charNameById.set(c.id, c.name);
  }

  const allSkills = new Set<string>();
  const recipeMap = new Map<string, RecipeEntry>();

  for (const row of allRecipes) {
    if (row.skillName) allSkills.add(row.skillName);

    // Apply skill filter if provided
    if (skillFilter && row.skillName !== skillFilter) continue;

    const key = row.recipeName;
    if (!recipeMap.has(key)) {
      recipeMap.set(key, {
        recipeName: row.recipeName,
        skill: row.skillName,
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
