import { createContext, useContext } from "react";

// Erlaubt Screens (z. B. die Mission auf Start), den aktiven Tab zu wechseln.
export type NavTab = "start" | "learn" | "depot" | "values" | "league";

export const NavContext = createContext<(tab: NavTab) => void>(() => {});

export function useNav(): (tab: NavTab) => void {
  return useContext(NavContext);
}
