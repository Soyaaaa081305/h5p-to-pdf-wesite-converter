import { useEffect, useState } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("h5p_theme");
    } catch {
      /* Storage can be disabled. */
    }
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (isDark) {
      root.classList.add("dark");
      themeColor?.setAttribute("content", "#09090b");
      try {
        localStorage.setItem("h5p_theme", "dark");
      } catch {
        /* Theme still works in memory. */
      }
    } else {
      root.classList.remove("dark");
      themeColor?.setAttribute("content", "#fafafa");
      try {
        localStorage.setItem("h5p_theme", "light");
      } catch {
        /* Theme still works in memory. */
      }
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return { isDark, toggleTheme };
}
