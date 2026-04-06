import type { ParsedCharacter, ParsedSkill, ParsedRecipe } from "@/types/character";

/**
 * Parse a Project Gorgon character.json export file.
 *
 * Known format (from community tools and source analysis):
 * {
 *   "Character": "CharacterName",
 *   "ServerName": "ServerName",
 *   "Race": "Human",
 *   "Timestamp": "2024-01-01T00:00:00",
 *   "Skills": {
 *     "Sword": { "Level": 50, "BonusLevels": 0, "XpTowardNextLevel": 1234, "XpNeededForNextLevel": 5000 },
 *     ...
 *   },
 *   "RecipeCompletions": {
 *     "recipe_1234": { ... },
 *     ...
 *   }
 * }
 */
export function parseCharacterJson(raw: string, filename?: string): ParsedCharacter {
  const data = JSON.parse(raw);

  // Extract name - try known field names in priority order
  let name = data.Character || data.Name || data.name || data.CharacterName || "";
  let server = data.ServerName || data.CurrentServer || data.Server || data.server || "";

  // Fallback: parse from filename pattern Character_<name>_<server>.json
  if (!name && filename) {
    const match = filename.match(/Character_([^_]+)_([^.]+)\.json/i);
    if (match) {
      name = match[1];
      server = server || match[2];
    }
  }

  if (!name) {
    throw new Error("Could not determine character name from file");
  }

  // Parse skills
  const skills: ParsedSkill[] = [];
  const skillsObj = data.Skills || data.skills || {};
  for (const [skillName, skillData] of Object.entries(skillsObj)) {
    if (typeof skillData === "object" && skillData !== null) {
      const sd = skillData as Record<string, unknown>;
      skills.push({
        name: skillName,
        level: Number(sd.Level ?? sd.level ?? 0),
        xp: sd.XpTowardNextLevel !== undefined ? Number(sd.XpTowardNextLevel)
          : sd.XP !== undefined ? Number(sd.XP)
          : sd.xp !== undefined ? Number(sd.xp)
          : undefined,
      });
    } else if (typeof skillData === "number") {
      skills.push({ name: skillName, level: skillData });
    }
  }

  // Parse recipes - try multiple known structures
  const recipes: ParsedRecipe[] = [];
  const recipeObj = data.RecipeCompletions || data.Recipes || data.recipes || data.KnownRecipes || {};
  for (const [recipeName, recipeData] of Object.entries(recipeObj)) {
    let skill: string | undefined;

    if (typeof recipeData === "object" && recipeData !== null) {
      const rd = recipeData as Record<string, unknown>;
      skill = (rd.SkillUsed || rd.Skill || rd.skill || undefined) as string | undefined;
    }

    // Try to extract skill from recipe internal name (e.g., "Recipe_Cooking_CheeseOmelet")
    if (!skill) {
      const parts = recipeName.split("_");
      if (parts.length >= 2 && parts[0].toLowerCase() === "recipe") {
        skill = parts[1];
      }
    }

    recipes.push({ name: recipeName, skill });
  }

  return { name, server, skills, recipes };
}
