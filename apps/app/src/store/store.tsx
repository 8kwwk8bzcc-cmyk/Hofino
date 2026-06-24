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
import { alleKonzepte } from "@hofino/learning";
import { supabase } from "../lib/supabase.js";
import { translate, type Lang } from "../i18n.js";

// Konzept → Themenblock (für die Haus-Stufen aus dem neuen Lernsystem).
const KONZEPT_BLOCK_IDS: Record<string, string[]> = alleKonzepte().reduce(
  (acc, k) => {
    (acc[k.themenblock_id] ??= []).push(k.id);
    return acc;
  },
  {} as Record<string, string[]>
);
const KONZEPTE_GESAMT = alleKonzepte().length;

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

export type Role = "child" | "adult" | "parent" | "teacher" | "student";

export interface PendingLink {
  parentProfileId: string;
}

export interface TeacherClass {
  id: string;
  name: string;
  code: string;
}

export interface ClassOverviewRow {
  childProfileId: string;
  displayName: string;
  modulesCompleted: number;
  knowledgePoints: number;
  avgQuiz: number | null;
  depotValueRoundedCents: number;
}

export interface MyClass {
  name: string;
  code: string;
}

export interface ChildSummary {
  profileId: string;
  displayName: string;
  completedCount: number;
  knowledgePoints: number;
  equityCents: number;
  performancePercent: number;
}

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
  completedKonzepte: string[];
  knowledgePoints: number;
  lernXpGesamt: number;
  lernXpSaison: number;
  korrekteAntworten: number;
  learningCapitalCents: number;
  hasInvested: boolean;
  instruments: Instrument[];
  prices: Map<string, number>;
  pendingLinks: PendingLink[];
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
  completedKonzepte: [],
  knowledgePoints: 0,
  lernXpGesamt: 0,
  lernXpSaison: 0,
  korrekteAntworten: 0,
  learningCapitalCents: 0,
  hasInvested: false,
  instruments: [],
  prices: new Map(),
  pendingLinks: [],
  loading: true,
};


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
    profileId: string | null;
    displayName: string;
    plot: string;
    portfolio: Portfolio;
    watchlist: string[];
    completed: string[];
    quiz: Record<string, QuizResult>;
    pendingLinks: PendingLink[];
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
    lernXpGesamt: number;
    lernXpSaison: number;
    korrekteAntworten: number;
  };
  register: (name: string, plot: string, email: string, password: string, role: Role) => Promise<AuthOutcome>;
  login: (email: string, password: string) => Promise<AuthOutcome>;
  createProfile: (name: string, plot: string, role: Role) => Promise<AuthOutcome>;
  signOut: () => Promise<void>;
  buy: (instrumentId: string, quantity: number) => Promise<OrderOutcome>;
  sell: (instrumentId: string, quantity: number) => Promise<OrderOutcome>;
  toggleWatch: (instrumentId: string) => Promise<void>;
  completeModule: (moduleId: string, correct: number, total: number) => Promise<void>;
  linkChild: (childCode: string) => Promise<AuthOutcome>;
  respondToLink: (parentProfileId: string, approve: boolean) => Promise<void>;
  fetchFamily: () => Promise<ChildSummary[]>;
  createClass: (name: string) => Promise<AuthOutcome & { code?: string }>;
  joinClass: (code: string) => Promise<AuthOutcome>;
  fetchTeacherClass: () => Promise<TeacherClass | null>;
  fetchClassOverview: (classId: string) => Promise<ClassOverviewRow[]>;
  fetchMyClass: () => Promise<MyClass | null>;
  fetchAssignments: (classId: string) => Promise<string[]>;
  assignKonzept: (classId: string, konzeptId: string) => Promise<void>;
  unassignKonzept: (classId: string, konzeptId: string) => Promise<void>;
  fetchMyAssignments: () => Promise<string[]>;
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(EMPTY);
  const dataRef = useRef(data);
  dataRef.current = data;

  const [lang, setLangState] = useState<Lang>(
    () => ((globalThis.localStorage?.getItem("hofino:lang") as Lang) || "de")
  );
  const setLang = useCallback((l: Lang) => {
    try {
      globalThis.localStorage?.setItem("hofino:lang", l);
    } catch {
      // ignorieren
    }
    setLangState(l);
  }, []);
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang],
  );

  const load = useCallback(async () => {
   try {
    let { data: auth } = await supabase.auth.getUser();
    let user = auth.user;
    // Dev-Auto-Login fürs Test-Cockpit (nur lokal mit EXPO_PUBLIC_DEV_LOGIN=1).
    if (!user && process.env.EXPO_PUBLIC_DEV_LOGIN === "1") {
      let email: string | null = null;
      try {
        email = new URLSearchParams(globalThis.location?.search ?? "").get("devlogin");
      } catch {
        email = null;
      }
      if (email) {
        const r = await supabase.auth.signInWithPassword({ email, password: "hofino-dev-123" });
        if (!r.error) {
          ({ data: auth } = await supabase.auth.getUser());
          user = auth.user;
        }
      }
    }
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

    const [instrumentsRes, pricesRes, portfolioRes, holdingsRes, watchRes, learnRes, pointsRes, grantsRes, ordersRes, pendingRes, fortschrittRes, statusRes, korrektRes] =
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
        supabase
          .from("parent_child_links")
          .select("parent_profile_id")
          .eq("child_profile_id", profileId)
          .eq("status", "pending"),
        supabase.from("lern_konzept_fortschritt").select("konzept_id, hoechste_abgeschlossene_stufe"),
        supabase.from("lern_status").select("xp_gesamt, xp_saison").eq("profile_id", profileId).maybeSingle(),
        supabase.from("lern_antworten").select("id", { count: "exact", head: true }).eq("korrekt", true),
      ]);

    const role = (profileRes.data.role as Role) ?? "child";
    const isPlayer = role !== "parent" && role !== "teacher"; // diese Rollen haben kein eigenes Depot.

    const prices = new Map<string, number>();
    for (const p of pricesRes.data ?? []) prices.set(p.instrument_id, p.price_cents);

    const completed: string[] = [];
    const quiz: Record<string, QuizResult> = {};
    if (isPlayer) {
      for (const lp of learnRes.data ?? []) {
        if (lp.completed_at) completed.push(lp.module_id);
        quiz[lp.module_id] = { score: lp.quiz_score ?? 0, perfect: !!lp.perfect };
      }
    }

    setData({
      sessionUserId: user.id,
      profileId,
      role,
      displayName: (profileRes.data.display_name as string) ?? "",
      plot: globalThis.localStorage?.getItem(plotKey(user.id)) ?? "",
      cashCents: isPlayer ? portfolioRes.data?.cash_cents ?? 0 : 0,
      holdings: isPlayer
        ? (holdingsRes.data ?? []).map((h) => ({
            instrumentId: h.instrument_id,
            quantity: h.quantity,
            avgCostCents: h.avg_cost_cents,
          }))
        : [],
      watchlist: isPlayer ? (watchRes.data ?? []).map((w) => w.instrument_id) : [],
      completed,
      quiz,
      completedKonzepte: isPlayer
        ? (fortschrittRes.data ?? [])
            .filter((r) => r.hoechste_abgeschlossene_stufe === "meistern")
            .map((r) => r.konzept_id)
        : [],
      knowledgePoints: isPlayer ? (pointsRes.data ?? []).reduce((s, r) => s + r.points, 0) : 0,
      lernXpGesamt: isPlayer ? Number(statusRes.data?.xp_gesamt ?? 0) : 0,
      lernXpSaison: isPlayer ? Number(statusRes.data?.xp_saison ?? 0) : 0,
      korrekteAntworten: isPlayer ? korrektRes.count ?? 0 : 0,
      learningCapitalCents: isPlayer ? (grantsRes.data ?? []).reduce((s, r) => s + r.amount_cents, 0) : 0,
      hasInvested: isPlayer ? (ordersRes.data ?? []).length > 0 : false,
      instruments: (instrumentsRes.data ?? []) as Instrument[],
      prices,
      pendingLinks: (pendingRes.data ?? []).map((r) => ({ parentProfileId: r.parent_profile_id })),
      loading: false,
    });
   } catch {
     // Netzwerk/Backend nicht erreichbar → nicht hängen bleiben, sondern Login zeigen.
     setData({ ...EMPTY, loading: false });
   }
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

  const linkChild = useCallback<StoreApi["linkChild"]>(async (childCode) => {
    const profileId = dataRef.current.profileId;
    if (!profileId) return { ok: false, message: "Nicht angemeldet." };
    const code = childCode.trim();
    if (code === profileId) return { ok: false, message: "Das ist dein eigener Code." };
    const ins = await supabase
      .from("parent_child_links")
      .insert({ parent_profile_id: profileId, child_profile_id: code, status: "pending" });
    if (ins.error) return { ok: false, message: "Code ungültig oder bereits angefragt." };
    return { ok: true };
  }, []);

  const respondToLink = useCallback<StoreApi["respondToLink"]>(
    async (parentProfileId, approve) => {
      await supabase.rpc("respond_to_parent_link", { p_parent: parentProfileId, p_approve: approve });
      await load();
    },
    [load]
  );

  const fetchFamily = useCallback<StoreApi["fetchFamily"]>(async () => {
    const profileId = dataRef.current.profileId;
    if (!profileId) return [];
    const links = await supabase
      .from("parent_child_links")
      .select("child_profile_id")
      .eq("parent_profile_id", profileId)
      .eq("status", "approved");
    const childIds = (links.data ?? []).map((l) => l.child_profile_id as string);
    if (childIds.length === 0) return [];

    const [profilesRes, portfoliosRes, holdingsRes, learnRes, pointsRes, grantsRes] = await Promise.all([
      supabase.from("profiles").select("id, display_name").in("id", childIds),
      supabase.from("portfolios").select("id, owner_profile_id, cash_cents").in("owner_profile_id", childIds),
      supabase.from("holdings").select("portfolio_id, instrument_id, quantity"),
      supabase.from("learning_progress").select("profile_id, completed_at"),
      supabase.from("knowledge_points").select("profile_id, points"),
      supabase.from("capital_grants").select("profile_id, amount_cents"),
    ]);

    const prices = dataRef.current.prices;
    const portfolioOwner = new Map<string, string>(); // portfolioId -> childId
    const cashByChild = new Map<string, number>();
    for (const p of portfoliosRes.data ?? []) {
      portfolioOwner.set(p.id, p.owner_profile_id);
      cashByChild.set(p.owner_profile_id, p.cash_cents);
    }
    const equityByChild = new Map<string, number>(cashByChild);
    for (const h of holdingsRes.data ?? []) {
      const child = portfolioOwner.get(h.portfolio_id);
      if (!child) continue;
      equityByChild.set(child, (equityByChild.get(child) ?? 0) + (prices.get(h.instrument_id) ?? 0) * h.quantity);
    }
    const completedByChild = new Map<string, number>();
    for (const lp of learnRes.data ?? []) {
      if (lp.completed_at) completedByChild.set(lp.profile_id, (completedByChild.get(lp.profile_id) ?? 0) + 1);
    }
    const pointsByChild = new Map<string, number>();
    for (const r of pointsRes.data ?? []) pointsByChild.set(r.profile_id, (pointsByChild.get(r.profile_id) ?? 0) + r.points);
    const capitalByChild = new Map<string, number>();
    for (const r of grantsRes.data ?? []) capitalByChild.set(r.profile_id, (capitalByChild.get(r.profile_id) ?? 0) + r.amount_cents);

    return (profilesRes.data ?? []).map((p) => {
      const equity = equityByChild.get(p.id) ?? cashByChild.get(p.id) ?? 0;
      return {
        profileId: p.id,
        displayName: p.display_name as string,
        completedCount: completedByChild.get(p.id) ?? 0,
        knowledgePoints: pointsByChild.get(p.id) ?? 0,
        equityCents: equity,
        performancePercent: performancePercent(equity, capitalByChild.get(p.id) ?? 0),
      };
    });
  }, []);

  const createClass = useCallback<StoreApi["createClass"]>(async (name) => {
    const { data: res, error } = await supabase.rpc("create_class", { p_name: name });
    if (error) return { ok: false, message: error.message };
    if (!res?.ok) return { ok: false, message: res?.reason ?? "Fehler" };
    return { ok: true, code: res.class_code as string };
  }, []);

  const joinClass = useCallback<StoreApi["joinClass"]>(
    async (code) => {
      const { data: res, error } = await supabase.rpc("join_class", { p_code: code });
      if (error) return { ok: false, message: error.message };
      if (!res?.ok) return { ok: false, message: res?.reason === "not_found" ? "Code nicht gefunden." : "Fehler" };
      await load();
      return { ok: true };
    },
    [load]
  );

  const fetchTeacherClass = useCallback<StoreApi["fetchTeacherClass"]>(async () => {
    const profileId = dataRef.current.profileId;
    if (!profileId) return null;
    const res = await supabase
      .from("classes")
      .select("id, name, class_code")
      .eq("teacher_profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!res.data) return null;
    return { id: res.data.id, name: res.data.name, code: res.data.class_code };
  }, []);

  const fetchClassOverview = useCallback<StoreApi["fetchClassOverview"]>(async (classId) => {
    const { data, error } = await supabase.rpc("class_overview", { p_class_id: classId });
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map((r) => ({
      childProfileId: r.child_profile_id as string,
      displayName: r.display_name as string,
      modulesCompleted: Number(r.modules_completed ?? 0),
      knowledgePoints: Number(r.knowledge_points ?? 0),
      avgQuiz: r.avg_quiz === null || r.avg_quiz === undefined ? null : Number(r.avg_quiz),
      depotValueRoundedCents: Number(r.depot_value_rounded_cents ?? 0),
    }));
  }, []);

  const fetchMyClass = useCallback<StoreApi["fetchMyClass"]>(async () => {
    const profileId = dataRef.current.profileId;
    if (!profileId) return null;
    const m = await supabase.from("class_members").select("class_id").eq("child_profile_id", profileId).maybeSingle();
    if (!m.data) return null;
    const c = await supabase.from("classes").select("name, class_code").eq("id", m.data.class_id).maybeSingle();
    return c.data ? { name: c.data.name, code: c.data.class_code } : null;
  }, []);

  // Lehrer: Konzept-Zuweisungen einer Klasse lesen/setzen (RLS erlaubt nur eigene Klassen).
  const fetchAssignments = useCallback<StoreApi["fetchAssignments"]>(async (classId) => {
    const { data } = await supabase.from("class_assignments").select("konzept_id").eq("class_id", classId);
    return (data ?? []).map((r) => r.konzept_id as string);
  }, []);

  const assignKonzept = useCallback<StoreApi["assignKonzept"]>(async (classId, konzeptId) => {
    await supabase.from("class_assignments").insert({ class_id: classId, konzept_id: konzeptId });
  }, []);

  const unassignKonzept = useCallback<StoreApi["unassignKonzept"]>(async (classId, konzeptId) => {
    await supabase.from("class_assignments").delete().eq("class_id", classId).eq("konzept_id", konzeptId);
  }, []);

  // Schüler: vom Lehrer zugewiesene Konzepte (RLS liefert nur die eigene Klasse).
  const fetchMyAssignments = useCallback<StoreApi["fetchMyAssignments"]>(async () => {
    const { data } = await supabase.from("class_assignments").select("konzept_id");
    return (data ?? []).map((r) => r.konzept_id as string);
  }, []);

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
    const done = data.completedKonzepte;
    const blocksDone = Object.values(KONZEPT_BLOCK_IDS).filter((ids) =>
      ids.every((id) => done.includes(id))
    ).length;
    return {
      holdingsValueCents: holdingsValueCents(portfolio, data.prices),
      equityCents,
      learningCapitalCents: data.learningCapitalCents,
      knowledgePoints: data.knowledgePoints,
      performancePercent: performancePercent(equityCents, data.learningCapitalCents),
      houseStage: houseStage({
        hasInvested: data.hasInvested,
        modulesCompleted: done.length,
        riskAndDiversificationUnderstood:
          done.includes("konzept_risiko") && done.includes("konzept_diversifikation"),
        themenbloeckeCompleted: blocksDone,
        milestonesReached: done.length >= KONZEPTE_GESAMT ? 1 : 0,
      }),
      completedCount: done.length,
      lernXpGesamt: data.lernXpGesamt,
      lernXpSaison: data.lernXpSaison,
      korrekteAntworten: data.korrekteAntworten,
    };
  }, [
    portfolio,
    data.prices,
    data.completedKonzepte,
    data.learningCapitalCents,
    data.knowledgePoints,
    data.hasInvested,
    data.lernXpGesamt,
    data.lernXpSaison,
    data.korrekteAntworten,
  ]);

  const api: StoreApi = {
    state: {
      onboarded: data.profileId !== null,
      hasSession: data.sessionUserId !== null,
      loading: data.loading,
      role: data.role,
      profileId: data.profileId,
      displayName: data.displayName,
      plot: data.plot,
      portfolio,
      watchlist: data.watchlist,
      completed: data.completed,
      quiz: data.quiz,
      pendingLinks: data.pendingLinks,
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
    linkChild,
    respondToLink,
    fetchFamily,
    createClass,
    joinClass,
    fetchTeacherClass,
    fetchClassOverview,
    fetchMyClass,
    fetchAssignments,
    assignKonzept,
    unassignKonzept,
    fetchMyAssignments,
    lang,
    setLang,
    t,
  };

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore muss innerhalb von StoreProvider verwendet werden");
  return ctx;
}
