import { createContext, useContext } from "react";

// Erlaubt Screens (z. B. die Mission auf Start), den aktiven Tab zu wechseln.
export type NavTab = "start" | "learn" | "depot" | "values" | "league";

// Optionales Ziel: z. B. ein konkretes Instrument im Werte-Tab öffnen.
export type NavOpts = { instrumentId?: string };

export const NavContext = createContext<(tab: NavTab, opts?: NavOpts) => void>(() => {});

export function useNav(): (tab: NavTab, opts?: NavOpts) => void {
  return useContext(NavContext);
}
