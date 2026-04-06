import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters, characterRecipes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { RecipeEntry } from "@/types/character";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const skillFilter = searchParams.get("skill");

  const database = db();

  // Get all recipes with their character names
  const rows = database
    .select({
      recipeName: characterRecipes.recipeName,
      skillName: characterRecipes.skillName,
      characterName: characters.name,
    })
    .from(characterRecipes)
    .innerJoin(characters, eq(characterRecipes.characterId, characters.id))
    .all();

  // Group by recipe
  const recipeMap = new Map<string, RecipeEntry>();
  const allSkills = new Set<string>();

  for (const row of rows) {
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
    recipeMap.get(key)!.knownBy.push(row.characterName);
  }

  const recipes = Array.from(recipeMap.values()).sort((a, b) =>
    a.recipeName.localeCompare(b.recipeName)
  );

  return NextResponse.json({
    recipes,
    skills: Array.from(allSkills).sort(),
  });
}
