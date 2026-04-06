"use client";

import { useState, useCallback } from "react";
import type { CharacterRow } from "@/types/character";

interface CharacterUploadProps {
  characters: CharacterRow[];
  onUploadComplete: () => void;
}

export default function CharacterUpload({ characters, onUploadComplete }: CharacterUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    setMessage(null);

    const results: string[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/characters", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          errors.push(`${file.name}: ${data.error}`);
        } else {
          results.push(`${data.name}: ${data.skillCount} skills, ${data.recipeCount} recipes`);
        }
      } catch {
        errors.push(`${file.name}: Network error`);
      }
    }

    setUploading(false);

    if (errors.length > 0) {
      setMessage({ type: "error", text: errors.join("; ") });
    } else {
      setMessage({ type: "success", text: `Uploaded: ${results.join("; ")}` });
    }

    onUploadComplete();
  }, [onUploadComplete]);

  const handleDelete = async (id: number) => {
    await fetch(`/api/characters/${id}`, { method: "DELETE" });
    onUploadComplete();
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragging ? "border-accent bg-accent/10" : "border-border hover:border-muted"
        }`}
      >
        <p className="text-muted mb-2">
          {uploading ? "Uploading..." : "Drag & drop character.json files here"}
        </p>
        <label className="inline-block cursor-pointer">
          <span className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors">
            Browse Files
          </span>
          <input
            type="file"
            accept=".json"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleUpload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {/* Status message */}
      {message && (
        <div className={`text-sm px-3 py-2 rounded ${
          message.type === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
        }`}>
          {message.text}
        </div>
      )}

      {/* Uploaded characters list */}
      {characters.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="px-4 py-2 border-b border-border">
            <h3 className="text-sm font-medium text-muted">
              Guild Members ({characters.length})
            </h3>
          </div>
          <div className="divide-y divide-border">
            {characters.map((char) => (
              <div key={char.id} className="flex items-center justify-between px-4 py-2">
                <div>
                  <span className="text-sm font-medium">{char.name}</span>
                  {char.server && (
                    <span className="text-xs text-muted ml-2">@ {char.server}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {new Date(char.uploadedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDelete(char.id)}
                    className="text-xs text-danger hover:text-danger/80 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
