import type { ParsedCharacter, ParsedSkill, ParsedRecipe } from "@/types/character";

/**
 * Parse a Project Gorgon character.json export file.
 *
 * The exact format will be confirmed with a sample file, but based on
 * community tools the structure is approximately:
 * {
 *   "Name": "CharacterName",
 *   "CurrentServer": "ServerName",
 *   "Skills": {
 *     "SkillName": { "Level": 50, "XP": 12345 },
 *     ...
 *   },
 *   "RecipeCompletions": {
 *     "recipe_1234": { "SkillUsed": "Cooking", ... },
 *     ...
 *   }
 * }
 */
export function parseCharacterJson(raw: string, filename?: string): ParsedCharacter {
  const data = JSON.parse(raw);

  // Extract name - try multiple known field names
  let name = data.Name || data.name || data.CharacterName || "";
  let server = data.CurrentServer || data.Server || data.server || "";

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
        xp: sd.XP !== undefined ? Number(sd.XP) : (sd.xp !== undefined ? Number(sd.xp) : undefined),
      });
    } else if (typeof skillData === "number") {
      skills.push({ name: skillName, level: skillData });
    }
  }

  // Parse recipes - try multiple known structures
  const recipes: ParsedRecipe[] = [];

  // Try RecipeCompletions format
  const recipeObj = data.RecipeCompletions || data.Recipes || data.recipes || data.KnownRecipes || {};
  for (const [recipeName, recipeData] of Object.entries(recipeObj)) {
    if (typeof recipeData === "object" && recipeData !== null) {
      const rd = recipeData as Record<string, unknown>;
      recipes.push({
        name: recipeName,
        skill: (rd.SkillUsed || rd.Skill || rd.skill || undefined) as string | undefined,
      });
    } else {
      recipes.push({ name: recipeName });
    }
  }

  return { name, server, skills, recipes };
}
