// Theme-Context: Light/Dark-Umschaltung für das CD „Grünanlage".
// Quelle der Farben: palettes in ../theme.ts. System-Preference als Default,
// manueller Override (persistiert auf Web via localStorage).
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";
import { palettes, type Palette, type ThemeMode } from "../theme.js";

const STORAGE_KEY = "hofino.theme";

type Override = ThemeMode | "system";

function readStored(): Override {
  try {
    if (typeof localStorage !== "undefined") {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "light" || v === "dark" || v === "system") return v;
    }
  } catch {
    /* ignore */
  }
  return "system";
}

function writeStored(v: Override) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* ignore */
  }
}

interface ThemeCtx {
  mode: ThemeMode; // tatsächlich aktiver Modus
  override: Override; // gewählte Einstellung (inkl. "system")
  colors: Palette;
  setOverride: (o: Override) => void;
  toggle: () => void; // schaltet hart zwischen light/dark
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverrideState] = useState<Override>(() => readStored());
  const [systemMode, setSystemMode] = useState<ThemeMode>(
    () => (Appearance.getColorScheme() === "dark" ? "dark" : "light"),
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) =>
      setSystemMode(colorScheme === "dark" ? "dark" : "light"),
    );
    return () => sub.remove();
  }, []);

  const mode: ThemeMode = override === "system" ? systemMode : override;

  const setOverride = (o: Override) => {
    writeStored(o);
    setOverrideState(o);
  };

  const value = useMemo<ThemeCtx>(
    () => ({
      mode,
      override,
      colors: palettes[mode],
      setOverride,
      toggle: () => setOverride(mode === "dark" ? "light" : "dark"),
    }),
    [mode, override],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}

/** Bequemer Zugriff nur auf die aktive Palette (häufigster Fall in Styles). */
export function useColors(): Palette {
  return useTheme().colors;
}

/**
 * Memoisierte, theme-abhängige Styles. `factory` muss modul-stabil sein
 * (const außerhalb der Komponente), damit nur bei Palettenwechsel neu gebaut wird.
 */
export function useThemedStyles<T>(factory: (c: Palette) => T): T {
  const c = useColors();
  return useMemo(() => factory(c), [c, factory]);
}
