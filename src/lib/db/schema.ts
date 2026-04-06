import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const characters = sqliteTable("characters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  server: text("server"),
  uploadedAt: text("uploaded_at").notNull().$defaultFn(() => new Date().toISOString()),
  rawJson: text("raw_json").notNull(),
}, (table) => [
  uniqueIndex("characters_name_server_idx").on(table.name, table.server),
]);

export const characterSkills = sqliteTable("character_skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  characterId: integer("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  skillName: text("skill_name").notNull(),
  level: integer("level").notNull().default(0),
  xpEarned: real("xp_earned"),
}, (table) => [
  uniqueIndex("character_skills_char_skill_idx").on(table.characterId, table.skillName),
]);

export const characterRecipes = sqliteTable("character_recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  characterId: integer("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  recipeName: text("recipe_name").notNull(),
  skillName: text("skill_name"),
}, (table) => [
  uniqueIndex("character_recipes_char_recipe_idx").on(table.characterId, table.recipeName),
]);
