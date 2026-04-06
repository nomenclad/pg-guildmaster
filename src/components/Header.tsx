"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Crafting Skills", href: "/" },
  { label: "Recipes", href: "/recipes" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            PG Guildmaster
          </h1>
          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-accent text-white"
                      : "text-muted hover:text-foreground hover:bg-card-hover"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
