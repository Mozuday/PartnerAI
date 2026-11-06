
"use client";

import { useEffect, useState } from "react";

export function useTheme() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      dark
    );
  }, [dark]);

  function toggleTheme() {
    setDark((previous) => !previous);
  }

  return {
    dark,
    setDark,
    toggleTheme,
  };
}