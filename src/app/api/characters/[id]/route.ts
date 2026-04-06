import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const characterId = parseInt(id, 10);

  if (isNaN(characterId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // CASCADE will delete skills and recipes
  const result = db().delete(characters).where(eq(characters.id, characterId)).run();

  if (result.changes === 0) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
