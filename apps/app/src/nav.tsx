import { createContext, useContext } from "react";

// Erlaubt Screens (z. B. die Mission auf Zuhause), den aktiven Tab zu wechseln.
export type NavTab = "home" | "uebung" | "depot" | "discover" | "rankings";

export const NavContext = createContext<(tab: NavTab) => void>(() => {});

export function useNav(): (tab: NavTab) => void {
  return useContext(NavContext);
}
