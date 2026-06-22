// Spielstand aus Supabase: Auth-Session, Lesen via RLS, Schreiben über serverseitige
// RPCs (place_order, complete_module). Ersetzt den früheren lokalen Store.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  depotValueCents,
  holdingsValueCents,
  performancePercent,
  houseStage,
  type Portfolio,
  type OrderError,
  type HouseStage,
} from "@hofino/core";
import { MODULES } from "@hofino/content";
import { supabase } from "../lib/supabase.js";

export interface Instrument {
  id: string;
  ticker: string;
  name: string;
  type: "stock" | "etf";
  sector: string;
  country: string;
}

interface QuizResult {
  score: number;
  perfect: boolean;
}

export type Role = "child" | "adult";

interface Data {
  sessionUserId: string | null;
  profileId: string | null;
  role: Role;
  displayName: string;
  plot: string;
  cashCents: number;
  holdings: { instrumentId: string; quantity: number; avgCostCents: number }[];
  watchlist: string[];
  completed: string[];
  quiz: Record<string, QuizResult>;
  knowledgePoints: number;
  learningCapitalCents: number;
  hasInvested: boolean;
  instruments: Instrument[];
  prices: Map<string, number>;
  loading: boolean;
}

const EMPTY: Data = {
  sessionUserId: null,
  profileId: null,
  role: "child",
  displayName: "",
  plot: "",
  cashCents: 0,
  holdings: [],
  watchlist: [],
  completed: [],
  quiz: {},
  knowledgePoints: 0,
  learningCapitalCents: 0,
  hasInvested: false,
  instruments: [],
  prices: new Map(),
  loading: true,
};

const BLOCK_OF: Record<string, string> = Object.fromEntries(MODULES.map((m) => [m.id, m.block]));
const BLOCK_IDS: Record<string, string[]> = MODULES.reduce(
  (acc, m) => {
    (acc[m.block] ??= []).push(m.id);
    return acc;
  },
  {} as Record<string, string[]>
);

function plotKey(userId: string) {
  return `hofino:plot:${userId}`;
}

export type OrderOutcome = { ok: true } | { ok: false; reason: OrderError | "error" };
export type AuthOutcome = { ok: true } | { ok: false; message: string };

interface StoreApi {
  state: {
    onboarded: boolean;
    hasSession: boolean;
    loading: boolean;
    role: Role;
    displayName: string;
    plot: string;
    portfolio: Portfolio;
    watchlist: string[];
    completed: string[];
    quiz: Record<string, QuizResult>;
  };
  instruments: Instrument[];
  instrumentById: Map<string, Instrument>;
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
  register: (name: string, plot: string, email: string, password: string, role: Role) => Promise<AuthOutcome>;
  login: (email: string, password: string) => Promise<AuthOutcome>;
  createProfile: (name: string, plot: string, role: Role) => Promise<AuthOutcome>;
  signOut: () => Promise<void>;
  buy: (instrumentId: string, quantity: number) => Promise<OrderOutcome>;
  sell: (instrumentId: string, quantity: number) => Promise<OrderOutcome>;
  toggleWatch: (instrumentId: string) => Promise<void>;
  completeModule: (moduleId: string, correct: number, total: number) => Promise<void>;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(EMPTY);
  const dataRef = useRef(data);
  dataRef.current = data;

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      setData({ ...EMPTY, loading: false });
      return;
    }

    const profileRes = await supabase
      .from("profiles")
      .select("id, role, display_name")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profileRes.data) {
      setData({ ...EMPTY, sessionUserId: user.id, profileId: null, loading: false });
      return;
    }
    const profileId = profileRes.data.id as string;

    // Jüngste Kurs-Charge bestimmen.
    const latest = await supabase
      .from("price_snapshots")
      .select("as_of")
      .order("as_of", { ascending: false })
      .limit(1);
    const asOf = latest.data?.[0]?.as_of as string | undefined;

    const [instrumentsRes, pricesRes, portfolioRes, holdingsRes, watchRes, learnRes, pointsRes, grantsRes, ordersRes] =
      await Promise.all([
        supabase.from("instruments").select("id, ticker, name, type, sector, country"),
        asOf
          ? supabase.from("price_snapshots").select("instrument_id, price_cents").eq("as_of", asOf)
          : Promise.resolve({ data: [] as { instrument_id: string; price_cents: number }[] }),
        supabase.from("portfolios").select("cash_cents").eq("owner_profile_id", profileId).maybeSingle(),
        supabase.from("holdings").select("instrument_id, quantity, avg_cost_cents"),
        supabase.from("watchlist").select("instrument_id"),
        supabase.from("learning_progress").select("module_id, quiz_score, perfect, completed_at"),
        supabase.from("knowledge_points").select("points"),
        supabase.from("capital_grants").select("amount_cents"),
        supabase.from("orders").select("id").limit(1),
      ]);

    const prices = new Map<string, number>();
    for (const p of pricesRes.data ?? []) prices.set(p.instrument_id, p.price_cents);

    const completed: string[] = [];
    const quiz: Record<string, QuizResult> = {};
    for (const lp of learnRes.data ?? []) {
      if (lp.completed_at) completed.push(lp.module_id);
      quiz[lp.module_id] = { score: lp.quiz_score ?? 0, perfect: !!lp.perfect };
    }

    setData({
      sessionUserId: user.id,
      profileId,
      role: (profileRes.data.role as Role) ?? "child",
      displayName: (profileRes.data.display_name as string) ?? "",
      plot: globalThis.localStorage?.getItem(plotKey(user.id)) ?? "",
      cashCents: portfolioRes.data?.cash_cents ?? 0,
      holdings: (holdingsRes.data ?? []).map((h) => ({
        instrumentId: h.instrument_id,
        quantity: h.quantity,
        avgCostCents: h.avg_cost_cents,
      })),
      watchlist: (watchRes.data ?? []).map((w) => w.instrument_id),
      completed,
      quiz,
      knowledgePoints: (pointsRes.data ?? []).reduce((s, r) => s + r.points, 0),
      learningCapitalCents: (grantsRes.data ?? []).reduce((s, r) => s + r.amount_cents, 0),
      hasInvested: (ordersRes.data ?? []).length > 0,
      instruments: (instrumentsRes.data ?? []) as Instrument[],
      prices,
      loading: false,
    });
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const register = useCallback<StoreApi["register"]>(
    async (name, plot, email, password, role) => {
      const { data: res, error } = await supabase.auth.signUp({ email, password });
      if (error) return { ok: false, message: error.message };
      const user = res.user;
      if (!user) return { ok: false, message: "Keine Session erhalten." };
      const ins = await supabase.from("profiles").insert({ auth_user_id: user.id, role, display_name: name });
      if (ins.error) return { ok: false, message: ins.error.message };
      try {
        globalThis.localStorage?.setItem(plotKey(user.id), plot);
      } catch {
        // ignorieren
      }
      await load();
      return { ok: true };
    },
    [load]
  );

  const createProfile = useCallback<StoreApi["createProfile"]>(
    async (name, plot, role) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return { ok: false, message: "Nicht angemeldet." };
      const ins = await supabase.from("profiles").insert({ auth_user_id: user.id, role, display_name: name });
      if (ins.error) return { ok: false, message: ins.error.message };
      try {
        globalThis.localStorage?.setItem(plotKey(user.id), plot);
      } catch {
        // ignorieren
      }
      await load();
      return { ok: true };
    },
    [load]
  );

  const login = useCallback<StoreApi["login"]>(
    async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, message: error.message };
      await load();
      return { ok: true };
    },
    [load]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setData({ ...EMPTY, loading: false });
  }, []);

  const order = useCallback(
    async (instrumentId: string, quantity: number, side: "buy" | "sell"): Promise<OrderOutcome> => {
      const { data: res, error } = await supabase.rpc("place_order", {
        p_instrument: instrumentId,
        p_side: side,
        p_qty: quantity,
      });
      if (error) return { ok: false, reason: "error" };
      if (!res?.ok) return { ok: false, reason: (res?.reason as OrderError) ?? "error" };
      await load();
      return { ok: true };
    },
    [load]
  );

  const toggleWatch = useCallback<StoreApi["toggleWatch"]>(
    async (instrumentId) => {
      const { profileId, watchlist } = dataRef.current;
      if (!profileId) return;
      if (watchlist.includes(instrumentId)) {
        await supabase.from("watchlist").delete().eq("profile_id", profileId).eq("instrument_id", instrumentId);
      } else {
        await supabase.from("watchlist").insert({ profile_id: profileId, instrument_id: instrumentId });
      }
      await load();
    },
    [load]
  );

  const completeModule = useCallback<StoreApi["completeModule"]>(
    async (moduleId, correct, total) => {
      await supabase.rpc("complete_module", { p_module: moduleId, p_correct: correct, p_total: total });
      await load();
    },
    [load]
  );

  const portfolio: Portfolio = useMemo(
    () => ({
      cashCents: data.cashCents,
      holdings: data.holdings.map((h) => ({
        instrumentId: h.instrumentId,
        quantity: h.quantity,
        avgCostCents: h.avgCostCents,
      })),
    }),
    [data.cashCents, data.holdings]
  );

  const instrumentById = useMemo(() => new Map(data.instruments.map((i) => [i.id, i])), [data.instruments]);

  const derived = useMemo(() => {
    const equityCents = depotValueCents(portfolio, data.prices);
    const blocksDone = Object.values(BLOCK_IDS).filter((ids) =>
      ids.every((id) => data.completed.includes(id))
    ).length;
    return {
      holdingsValueCents: holdingsValueCents(portfolio, data.prices),
      equityCents,
      learningCapitalCents: data.learningCapitalCents,
      knowledgePoints: data.knowledgePoints,
      performancePercent: performancePercent(equityCents, data.learningCapitalCents),
      houseStage: houseStage({
        hasInvested: data.hasInvested,
        modulesCompleted: data.completed.length,
        riskAndDiversificationUnderstood:
          data.completed.includes("m13") && data.completed.includes("m14"),
        themenbloeckeCompleted: blocksDone,
        milestonesReached: MODULES.every((m) => data.completed.includes(m.id)) ? 1 : 0,
      }),
      completedCount: data.completed.length,
    };
  }, [portfolio, data.prices, data.completed, data.learningCapitalCents, data.knowledgePoints, data.hasInvested]);

  const api: StoreApi = {
    state: {
      onboarded: data.profileId !== null,
      hasSession: data.sessionUserId !== null,
      loading: data.loading,
      role: data.role,
      displayName: data.displayName,
      plot: data.plot,
      portfolio,
      watchlist: data.watchlist,
      completed: data.completed,
      quiz: data.quiz,
    },
    instruments: data.instruments,
    instrumentById,
    prices: data.prices,
    derived,
    register,
    login,
    createProfile,
    signOut,
    buy: (id, qty) => order(id, qty, "buy"),
    sell: (id, qty) => order(id, qty, "sell"),
    toggleWatch,
    completeModule,
  };

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore muss innerhalb von StoreProvider verwendet werden");
  return ctx;
}

// Block-Zuordnung für andere Module bei Bedarf.
export { BLOCK_OF };
