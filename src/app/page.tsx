"use client";

import { useState, useEffect, useCallback } from "react";
import CharacterUpload from "@/components/CharacterUpload";
import SkillSummaryTable from "@/components/SkillSummaryTable";
import { getCharacters, getSkillSummary } from "@/lib/guildStore";
import type { CharacterRow, SkillSummaryEntry } from "@/types/character";

export default function Home() {
  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [skillData, setSkillData] = useState<{ entries: SkillSummaryEntry[]; skillNames: string[] }>({
    entries: [],
    skillNames: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [chars, skills] = await Promise.all([
      getCharacters(),
      getSkillSummary(),
    ]);
    setCharacters(chars);
    setSkillData(skills);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-4">Upload Characters</h2>
        <CharacterUpload characters={characters} onUploadComplete={fetchData} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">
          Crafting Skills
          {skillData.entries.length > 0 && (
            <span className="text-sm font-normal text-muted ml-2">
              {skillData.entries.length} members &middot; {skillData.skillNames.length} skills
            </span>
          )}
        </h2>
        {loading ? (
          <div className="text-center py-12 text-muted">Loading...</div>
        ) : (
          <SkillSummaryTable
            entries={skillData.entries}
            skillNames={skillData.skillNames}
          />
        )}
      </section>
    </div>
  );
}
