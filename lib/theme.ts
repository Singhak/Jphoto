"use client";

import { useCallback, useEffect, useState } from "react";
import { darkQuery, KEY, type Theme } from "./theme-script";

export type { Theme };
const CHANGED = "jphoto-theme-change";

function apply(theme: Theme) {
  const resolved = theme === "system" ? (matchMedia(darkQuery).matches ? "dark" : "light") : theme;
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  // Load the saved choice, and stay in sync when another control on the page (header or settings) changes it.
  useEffect(() => {
    const load = () => {
      let saved: Theme = "system";
      try {
        saved = (localStorage.getItem(KEY) as Theme) || "system";
      } catch {}
      setThemeState(saved);
      setResolved(apply(saved));
    };
    load();
    window.addEventListener(CHANGED, load);
    return () => window.removeEventListener(CHANGED, load);
  }, []);

  // While on "system", follow the device when it switches (e.g. automatic dark mode at night).
  useEffect(() => {
    if (theme !== "system") return;
    const mq = matchMedia(darkQuery);
    const onChange = () => setResolved(apply("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    setThemeState(next);
    setResolved(apply(next));
    window.dispatchEvent(new Event(CHANGED));
  }, []);

  return { theme, resolved, setTheme };
}
