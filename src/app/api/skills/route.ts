import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters, characterSkills } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { SkillSummaryEntry } from "@/types/character";

export async function GET() {
  const database = db();

  const allCharacters = database.select({
    id: characters.id,
    name: characters.name,
  }).from(characters).all();

  const allSkillNames = new Set<string>();
  const entries: SkillSummaryEntry[] = [];

  for (const char of allCharacters) {
    const skills = database.select({
      skillName: characterSkills.skillName,
      level: characterSkills.level,
    })
      .from(characterSkills)
      .where(eq(characterSkills.characterId, char.id))
      .all();

    const skillMap: Record<string, number> = {};
    for (const s of skills) {
      skillMap[s.skillName] = s.level;
      allSkillNames.add(s.skillName);
    }

    entries.push({
      characterName: char.name,
      skills: skillMap,
    });
  }

  return NextResponse.json({
    skillNames: Array.from(allSkillNames).sort(),
    entries,
  });
}
