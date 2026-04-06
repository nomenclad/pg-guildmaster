"use client";

import { useState, useEffect } from "react";
import { refreshFromCdn, getCdnStatus } from "@/lib/pgData";

export default function DataPage() {
  const [status, setStatus] = useState<{
    updatedAt: string | null;
    version: string | null;
    recipeCount: number;
  } | null>(null);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    getCdnStatus().then(setStatus);
  }, []);

  const handleRefresh = async () => {
    setFetching(true);
    setMessage(null);
    try {
      const result = await refreshFromCdn();
      setMessage({
        type: "success",
        text: `Updated ${result.recipeCount.toLocaleString()} recipes from CDN v${result.version}`,
      });
      setStatus(await getCdnStatus());
    } catch (e) {
      setMessage({
        type: "error",
        text: `Failed to fetch: ${e instanceof Error ? e.message : "Unknown error"}`,
      });
    }
    setFetching(false);
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Game Data</h2>
        <p className="text-sm text-muted">
          Recipe names and icons are loaded from the Project Gorgon CDN.
          Use the button below to fetch the latest data.
        </p>
      </div>

      {/* Status card */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <h3 className="text-sm font-medium">Recipe Data</h3>

        {status && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted">Recipes loaded</span>
            <span className="font-mono">
              {status.recipeCount > 0 ? status.recipeCount.toLocaleString() : "None"}
            </span>

            <span className="text-muted">CDN version</span>
            <span className="font-mono">{status.version ?? "N/A"}</span>

            <span className="text-muted">Last updated</span>
            <span className="font-mono">
              {status.updatedAt
                ? new Date(status.updatedAt).toLocaleString()
                : "Never"}
            </span>
          </div>
        )}

        <button
          onClick={handleRefresh}
          disabled={fetching}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {fetching ? "Fetching..." : "Update from CDN"}
        </button>

        {message && (
          <div className={`text-sm px-3 py-2 rounded ${
            message.type === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}>
            {message.text}
          </div>
        )}
      </div>

      <p className="text-xs text-muted">
        Data is fetched from cdn.projectgorgon.com and stored locally in your browser.
        It persists across page reloads.
      </p>
    </div>
  );
}
