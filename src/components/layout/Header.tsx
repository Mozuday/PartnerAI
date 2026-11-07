"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

type HeaderProps = {
  dark: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
};

export function Header({
  dark,
  sidebarOpen,
  onToggleSidebar,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header
      className={`sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 sm:px-6`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <path d="M9 4v16" />
          </svg>
        </Button>

        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            PartnerAI
          </h1>

          <p className="hidden text-xs sm:block text-muted-foreground">
            Your personal AI assistant
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggleTheme}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? (
          <>
            <Sun className="h-5 w-5" />
            <span className="sr-only">Switch to light mode</span>
          </>
        ) : (
          <>
            <Moon className="h-5 w-5" />
            <span className="sr-only">Switch to dark mode</span>
          </>
        )}
      </Button>
    </header>
  );
}