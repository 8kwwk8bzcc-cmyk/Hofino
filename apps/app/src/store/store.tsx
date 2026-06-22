// Lokaler Spielstand (MVP, Schritt 1): Zustand im Browser, Logik aus @hofino/core,
// Kurse aus @hofino/market-data. Supabase/Auth wird in einem späteren Schritt angebunden.
import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import {
  buy as coreBuy,
  sell as coreSell,
  createPortfolio,
  depotValueCents,
  holdingsValueCents,
  grantLearningCapital,
  totalLearningCapitalCents,
  awardKnowledgePoints,
  totalKnowledgePoints,
  performancePercent,
  houseStage,
  type Portfolio,
  type OrderError,
  type CapitalGrant,
  type PointsAward,
  type HouseStage,
} from "@hofino/core";
import { MODULES } from "@hofino/content";
import { SimulatedMarketDataProvider } from "@hofino/market-data";
import { INSTRUMENTS } from "../data/instruments.js";

const STORAGE_KEY = "hofino:kids:v2";
const PASS_RATIO = 0.6;

interface QuizResult {
  score: number; // 0..100
  perfect: boolean;
}

export interface GameState {
  onboarded: boolean;
  displayName: string;
  plot: string;
  investedEver: boolean;
  portfolio: Portfolio;
  watchlist: string[];
  grants: readonly CapitalGrant[];
  points: readonly PointsAward[];
  completed: string[];
  quiz: Record<string, QuizResult>;
}

const initialState: GameState = {
  onboarded: false,
  displayName: "",
  plot: "",
  investedEver: false,
  portfolio: createPortfolio(),
  watchlist: [],
  grants: [],
  points: [],
  completed: [],
  quiz: {},
};

// Themenblöcke aus dem Inhalt ableiten (Block -> Modul-IDs).
const BLOCKS: Record<string, string[]> = MODULES.reduce(
  (acc, m) => {
    (acc[m.block] ??= []).push(m.id);
    return acc;
  },
  {} as Record<string, string[]>
);

type Action =
  | { type: "ONBOARD"; name: string; plot: string }
  | { type: "BUY"; instrumentId: string; quantity: number; priceCents: number }
  | { type: "SELL"; instrumentId: string; quantity: number; priceCents: number }
  | { type: "TOGGLE_WATCH"; instrumentId: string }
  | { type: "COMPLETE_MODULE"; moduleId: string; correct: number; total: number }
  | { type: "RESET" };

function applyRewards(state: GameState, moduleId: string, correct: number, total: number): GameState {
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = total > 0 && correct / total >= PASS_RATIO;
  const perfect = total > 0 && correct === total;

  let grants = state.grants;
  let points = state.points;
  // Neu gewährtes Lernkapital wird dem Cash gutgeschrieben (man kann es investieren).
  // Die Performance-Basis (Start + Lernkapital) wächst mit, daher ist der Erhalt
  // performance-neutral – nur Markt und Gebühren bewegen die Quote.
  let addedCapital = 0;
  const grant = (reason: Parameters<typeof grantLearningCapital>[1], ref: string) => {
    const r = grantLearningCapital(grants, reason, ref);
    grants = r.grants;
    addedCapital += r.addedCents;
  };

  grant("module_done", moduleId);
  points = awardKnowledgePoints(points, "module_done", moduleId).awards;
  if (passed) points = awardKnowledgePoints(points, "quiz_passed", moduleId).awards;
  if (perfect) {
    grant("quiz_perfect", moduleId);
    points = awardKnowledgePoints(points, "quiz_perfect_bonus", moduleId).awards;
  }

  const completed = state.completed.includes(moduleId)
    ? state.completed
    : [...state.completed, moduleId];

  // Themenblock-Belohnung, sobald ein Block vollständig abgeschlossen ist.
  for (const [block, ids] of Object.entries(BLOCKS)) {
    if (ids.every((id) => completed.includes(id))) {
      grant("themenblock", block);
      points = awardKnowledgePoints(points, "themenblock", block).awards;
    }
  }
  // Großer Meilenstein: alle Module abgeschlossen.
  if (MODULES.every((m) => completed.includes(m.id))) {
    grant("milestone", "all-modules");
    points = awardKnowledgePoints(points, "milestone", "all-modules").awards;
  }

  const portfolio =
    addedCapital > 0
      ? { ...state.portfolio, cashCents: state.portfolio.cashCents + addedCapital }
      : state.portfolio;

  return {
    ...state,
    grants,
    points,
    completed,
    portfolio,
    quiz: { ...state.quiz, [moduleId]: { score, perfect } },
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "ONBOARD":
      return { ...state, onboarded: true, displayName: action.name, plot: action.plot };
    case "BUY": {
      const r = coreBuy(state.portfolio, action.instrumentId, action.quantity, action.priceCents);
      if (!r.ok) return state;
      return { ...state, portfolio: r.portfolio, investedEver: true };
    }
    case "SELL": {
      const r = coreSell(state.portfolio, action.instrumentId, action.quantity, action.priceCents);
      if (!r.ok) return state;
      return { ...state, portfolio: r.portfolio };
    }
    case "TOGGLE_WATCH": {
      const has = state.watchlist.includes(action.instrumentId);
      return {
        ...state,
        watchlist: has
          ? state.watchlist.filter((i) => i !== action.instrumentId)
          : [...state.watchlist, action.instrumentId],
      };
    }
    case "COMPLETE_MODULE":
      return applyRewards(state, action.moduleId, action.correct, action.total);
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

function loadState(): GameState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) return { ...initialState, ...JSON.parse(raw) } as GameState;
  } catch {
    // ignorieren – frischer Start
  }
  return initialState;
}

export type OrderOutcome = { ok: true } | { ok: false; reason: OrderError };

interface StoreApi {
  state: GameState;
  prices: ReadonlyMap<string, number>;
  derived: {
    holdingsValueCents: number;
    equityCents: number;
    learningCapitalCents: number;
    knowledgePoints: number;
    performancePercent: number;
    houseStage: HouseStage;
    completedCount: number;
  };
  onboard: (name: string, plot: string) => void;
  buy: (instrumentId: string, quantity: number) => OrderOutcome;
  sell: (instrumentId: string, quantity: number) => OrderOutcome;
  toggleWatch: (instrumentId: string) => void;
  completeModule: (moduleId: string, correct: number, total: number) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [, setTick] = useState(0);

  const provider = useMemo(
    () => new SimulatedMarketDataProvider(INSTRUMENTS.map((i) => ({ id: i.id, basePriceCents: i.basePriceCents }))),
    []
  );

  // Persistieren bei jeder Änderung.
  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignorieren
    }
  }, [state]);

  // Minütlich neu rendern (fängt Stundenwechsel der Kurse).
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const prices = useMemo(() => {
    const now = new Date();
    const map = new Map<string, number>();
    for (const i of INSTRUMENTS) map.set(i.id, provider.priceAtCents(i.id, now));
    return map;
  }, [provider, Math.floor(Date.now() / 3_600_000)]);

  const derived = useMemo(() => {
    const learningCapitalCents = totalLearningCapitalCents(state.grants);
    const equityCents = depotValueCents(state.portfolio, prices);
    return {
      holdingsValueCents: holdingsValueCents(state.portfolio, prices),
      equityCents,
      learningCapitalCents,
      knowledgePoints: totalKnowledgePoints(state.points),
      performancePercent: performancePercent(equityCents, learningCapitalCents),
      houseStage: houseStage({
        hasInvested: state.investedEver,
        modulesCompleted: state.completed.length,
        riskAndDiversificationUnderstood:
          state.completed.includes("m13") && state.completed.includes("m14"),
        themenbloeckeCompleted: Object.values(BLOCKS).filter((ids) =>
          ids.every((id) => state.completed.includes(id))
        ).length,
        milestonesReached: MODULES.every((m) => state.completed.includes(m.id)) ? 1 : 0,
      }),
      completedCount: state.completed.length,
    };
  }, [state, prices]);

  const api: StoreApi = {
    state,
    prices,
    derived,
    onboard: (name, plot) => dispatch({ type: "ONBOARD", name, plot }),
    buy: (instrumentId, quantity) => {
      const priceCents = prices.get(instrumentId) ?? 0;
      const r = coreBuy(state.portfolio, instrumentId, quantity, priceCents);
      if (!r.ok) return { ok: false, reason: r.reason };
      dispatch({ type: "BUY", instrumentId, quantity, priceCents });
      return { ok: true };
    },
    sell: (instrumentId, quantity) => {
      const priceCents = prices.get(instrumentId) ?? 0;
      const r = coreSell(state.portfolio, instrumentId, quantity, priceCents);
      if (!r.ok) return { ok: false, reason: r.reason };
      dispatch({ type: "SELL", instrumentId, quantity, priceCents });
      return { ok: true };
    },
    toggleWatch: (instrumentId) => dispatch({ type: "TOGGLE_WATCH", instrumentId }),
    completeModule: (moduleId, correct, total) =>
      dispatch({ type: "COMPLETE_MODULE", moduleId, correct, total }),
    reset: () => dispatch({ type: "RESET" }),
  };

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore muss innerhalb von StoreProvider verwendet werden");
  return ctx;
}
