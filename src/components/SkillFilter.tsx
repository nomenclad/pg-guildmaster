"use client";

interface SkillFilterProps {
  skills: string[];
  selectedSkill: string | null;
  onSelectSkill: (skill: string | null) => void;
}

export default function SkillFilter({ skills, selectedSkill, onSelectSkill }: SkillFilterProps) {
  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-4 py-2 border-b border-border">
        <h3 className="text-sm font-medium text-muted">Filter by Skill</h3>
      </div>
      <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        <button
          onClick={() => onSelectSkill(null)}
          className={`w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
            selectedSkill === null
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground hover:bg-card-hover"
          }`}
        >
          All Skills
        </button>
        {skills.map((skill) => (
          <button
            key={skill}
            onClick={() => onSelectSkill(skill)}
            className={`w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
              selectedSkill === skill
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground hover:bg-card-hover"
            }`}
          >
            {skill}
          </button>
        ))}
      </div>
    </div>
  );
}
