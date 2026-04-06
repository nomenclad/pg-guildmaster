export interface ParsedCharacter {
  name: string;
  server: string;
  skills: ParsedSkill[];
  recipes: ParsedRecipe[];
}

export interface ParsedSkill {
  name: string;
  level: number;
  xp?: number;
}

export interface ParsedRecipe {
  name: string;
  skill?: string;
}

export interface CharacterRow {
  id: number;
  name: string;
  server: string | null;
  uploadedAt: string;
}

export interface SkillSummaryEntry {
  characterName: string;
  skills: Record<string, number>;
}

export interface RecipeEntry {
  recipeName: string;
  skill: string | null;
  knownBy: string[];
}
