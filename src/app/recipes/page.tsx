"use client";

import { useState, useEffect } from "react";
import RecipeTable from "@/components/RecipeTable";
import SkillFilter from "@/components/SkillFilter";
import { useFilterStore } from "@/stores/filterStore";
import type { RecipeEntry } from "@/types/character";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeEntry[]>([]);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const { recipeSkillFilter, recipeSearch, setRecipeSkillFilter, setRecipeSearch } = useFilterStore();

  useEffect(() => {
    async function fetchRecipes() {
      setLoading(true);
      const params = new URLSearchParams();
      if (recipeSkillFilter) params.set("skill", recipeSkillFilter);

      const res = await fetch(`/api/recipes?${params}`);
      const data = await res.json();
      setRecipes(data.recipes);
      setAllSkills(data.skills);
      setLoading(false);
    }

    fetchRecipes();
  }, [recipeSkillFilter]);

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-52 shrink-0">
        <SkillFilter
          skills={allSkills}
          selectedSkill={recipeSkillFilter}
          onSelectSkill={setRecipeSkillFilter}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            Recipes
            {recipes.length > 0 && (
              <span className="text-sm font-normal text-muted ml-2">
                {recipes.length} recipes
              </span>
            )}
          </h2>
          <input
            type="text"
            placeholder="Search recipes..."
            value={recipeSearch}
            onChange={(e) => setRecipeSearch(e.target.value)}
            className="px-3 py-1.5 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted">Loading...</div>
        ) : (
          <RecipeTable recipes={recipes} searchQuery={recipeSearch} />
        )}
      </div>
    </div>
  );
}
