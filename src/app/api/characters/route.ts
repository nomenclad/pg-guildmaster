import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters, characterSkills, characterRecipes } from "@/lib/db/schema";
import { parseCharacterJson } from "@/lib/parser";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const allCharacters = db().select({
    id: characters.id,
    name: characters.name,
    server: characters.server,
    uploadedAt: characters.uploadedAt,
  }).from(characters).all();

  return NextResponse.json(allCharacters);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const raw = await file.text();

  let parsed;
  try {
    parsed = parseCharacterJson(raw, file.name);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to parse character file: ${e instanceof Error ? e.message : "Unknown error"}` },
      { status: 400 }
    );
  }

  const database = db();

  // Check for existing character (upsert)
  const existing = database.select({ id: characters.id })
    .from(characters)
    .where(
      parsed.server
        ? and(eq(characters.name, parsed.name), eq(characters.server, parsed.server))
        : eq(characters.name, parsed.name)
    )
    .get();

  let characterId: number;

  if (existing) {
    // Update existing character
    database.update(characters)
      .set({
        rawJson: raw,
        uploadedAt: new Date().toISOString(),
        server: parsed.server || undefined,
      })
      .where(eq(characters.id, existing.id))
      .run();

    characterId = existing.id;

    // Delete old skills and recipes
    database.delete(characterSkills).where(eq(characterSkills.characterId, characterId)).run();
    database.delete(characterRecipes).where(eq(characterRecipes.characterId, characterId)).run();
  } else {
    // Insert new character
    const result = database.insert(characters).values({
      name: parsed.name,
      server: parsed.server || null,
      rawJson: raw,
      uploadedAt: new Date().toISOString(),
    }).returning({ id: characters.id }).get();

    characterId = result.id;
  }

  // Insert skills
  if (parsed.skills.length > 0) {
    database.insert(characterSkills).values(
      parsed.skills.map((s) => ({
        characterId,
        skillName: s.name,
        level: s.level,
        xpEarned: s.xp ?? null,
      }))
    ).run();
  }

  // Insert recipes
  if (parsed.recipes.length > 0) {
    database.insert(characterRecipes).values(
      parsed.recipes.map((r) => ({
        characterId,
        recipeName: r.name,
        skillName: r.skill ?? null,
      }))
    ).run();
  }

  return NextResponse.json({
    id: characterId,
    name: parsed.name,
    server: parsed.server,
    skillCount: parsed.skills.length,
    recipeCount: parsed.recipes.length,
  });
}
