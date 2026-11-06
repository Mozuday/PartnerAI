"use client";

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
      className={`sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 transition-colors duration-300 sm:px-6 ${
        dark
          ? "border-[#262626] bg-black text-[#F5F5F5]"
          : "border-[#E5DED1] bg-[#F5F1E8] text-[#292720]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
            dark ? "hover:bg-[#1A1A1A]" : "hover:bg-[#EAE4D9]"
          }`}
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
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            PartnerAI
          </h1>

          <p
            className={`hidden text-xs sm:block ${
              dark ? "text-[#858585]" : "text-[#858072]"
            }`}
          >
            Your personal AI assistant
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
          dark
            ? "border-[#303030] bg-[#111111] text-[#E5C987] hover:bg-[#1C1C1C]"
            : "border-[#E5DED1] bg-[#FFFCF5] text-[#78613B] hover:bg-[#EAE4D9]"
        }`}
      >
        {dark ? (
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.42 1.42" />
            <path d="m17.65 17.65 1.42 1.42" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.35 17.65-1.42 1.42" />
            <path d="m19.07 4.93-1.42 1.42" />
          </svg>
        ) : (
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
          </svg>
        )}
      </button>
    </header>
  );
}