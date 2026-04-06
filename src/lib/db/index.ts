import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "guildmaster.db");

function getDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // Auto-migrate: create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      server TEXT,
      uploaded_at TEXT NOT NULL,
      raw_json TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS characters_name_server_idx ON characters(name, server);

    CREATE TABLE IF NOT EXISTS character_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      skill_name TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 0,
      xp_earned REAL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS character_skills_char_skill_idx ON character_skills(character_id, skill_name);

    CREATE TABLE IF NOT EXISTS character_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      recipe_name TEXT NOT NULL,
      skill_name TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS character_recipes_char_recipe_idx ON character_recipes(character_id, recipe_name);
  `);

  return drizzle(sqlite, { schema });
}

// Singleton for the db connection
let _db: ReturnType<typeof getDb> | null = null;

export function db() {
  if (!_db) {
    _db = getDb();
  }
  return _db;
}
