"use client";

import { useState, useCallback, useEffect } from "react";
import {
  uploadCharacter,
  deleteCharacter,
  hasAdminPassword,
  setAdminPassword,
  verifyAdminPassword,
} from "@/lib/guildStore";
import type { CharacterRow } from "@/types/character";

interface CharacterUploadProps {
  characters: CharacterRow[];
  onUploadComplete: () => void;
}

export default function CharacterUpload({ characters, onUploadComplete }: CharacterUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Admin password state
  const [passwordSet, setPasswordSet] = useState<boolean | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState<
    { mode: "setup" } | { mode: "verify"; charId: number } | null
  >(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    hasAdminPassword().then(setPasswordSet);
  }, []);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    setMessage(null);

    const results: string[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const data = await uploadCharacter(file);
        results.push(`${data.name}: ${data.skillCount} skills, ${data.recipeCount} recipes`);
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : "Unknown error"}`);
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

  const handleRemoveClick = (charId: number) => {
    if (!passwordSet) {
      setShowPasswordDialog({ mode: "setup" });
    } else {
      setShowPasswordDialog({ mode: "verify", charId });
    }
    setPasswordInput("");
    setPasswordConfirm("");
    setPasswordError("");
  };

  const handlePasswordSetup = async () => {
    if (passwordInput.length < 4) {
      setPasswordError("Password must be at least 4 characters");
      return;
    }
    if (passwordInput !== passwordConfirm) {
      setPasswordError("Passwords do not match");
      return;
    }
    await setAdminPassword(passwordInput);
    setPasswordSet(true);
    setShowPasswordDialog(null);
    setMessage({ type: "success", text: "Admin password set. Use it to remove guild members." });
  };

  const handlePasswordVerify = async () => {
    if (!showPasswordDialog || showPasswordDialog.mode !== "verify") return;
    const ok = await verifyAdminPassword(passwordInput);
    if (!ok) {
      setPasswordError("Incorrect password");
      return;
    }
    await deleteCharacter(showPasswordDialog.charId);
    setShowPasswordDialog(null);
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

      {/* Password dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-80 space-y-4">
            {showPasswordDialog.mode === "setup" ? (
              <>
                <h3 className="text-sm font-semibold">Set Admin Password</h3>
                <p className="text-xs text-muted">
                  Create a password to protect guild member removal.
                </p>
                <input
                  type="password"
                  placeholder="Password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-accent"
                  autoFocus
                />
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-accent"
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSetup()}
                />
                {passwordError && (
                  <p className="text-xs text-danger">{passwordError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowPasswordDialog(null)}
                    className="px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordSetup}
                    className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors"
                  >
                    Set Password
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold">Admin Password Required</h3>
                <p className="text-xs text-muted">
                  Enter the admin password to remove this guild member.
                </p>
                <input
                  type="password"
                  placeholder="Password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-accent"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordVerify()}
                />
                {passwordError && (
                  <p className="text-xs text-danger">{passwordError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowPasswordDialog(null)}
                    className="px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordVerify}
                    className="px-3 py-1.5 bg-danger hover:bg-danger/80 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
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
                    onClick={() => handleRemoveClick(char.id)}
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
