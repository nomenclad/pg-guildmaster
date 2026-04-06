import { create } from "zustand";

interface FilterState {
  recipeSkillFilter: string | null;
  recipeSearch: string;
  setRecipeSkillFilter: (skill: string | null) => void;
  setRecipeSearch: (search: string) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  recipeSkillFilter: null,
  recipeSearch: "",
  setRecipeSkillFilter: (skill) => set({ recipeSkillFilter: skill }),
  setRecipeSearch: (search) => set({ recipeSearch: search }),
}));
