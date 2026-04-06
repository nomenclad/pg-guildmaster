import Dexie, { type EntityTable } from "dexie";

export interface Character {
  id: number;
  name: string;
  server: string | null;
  uploadedAt: string;
  rawJson: string;
}

export interface CharacterSkill {
  id: number;
  characterId: number;
  skillName: string;
  level: number;
  xpEarned: number | null;
}

export interface CharacterRecipe {
  id: number;
  characterId: number;
  recipeName: string;
  skillName: string | null;
}

export interface AppSetting {
  key: string;
  value: string;
}

const db = new Dexie("GuildmasterDB") as Dexie & {
  characters: EntityTable<Character, "id">;
  characterSkills: EntityTable<CharacterSkill, "id">;
  characterRecipes: EntityTable<CharacterRecipe, "id">;
  settings: EntityTable<AppSetting, "key">;
};

db.version(1).stores({
  characters: "++id, [name+server]",
  characterSkills: "++id, characterId, [characterId+skillName]",
  characterRecipes: "++id, characterId, [characterId+recipeName]",
});

db.version(2).stores({
  characters: "++id, [name+server]",
  characterSkills: "++id, characterId, [characterId+skillName]",
  characterRecipes: "++id, characterId, [characterId+recipeName]",
  settings: "key",
});

export { db };
