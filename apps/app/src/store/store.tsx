// Spielstand aus Supabase: Auth-Session, Lesen via RLS, Schreiben über serverseitige
// RPCs (place_order, lern_*). Ersetzt den früheren lokalen Store.
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
import type { ChallengeMetric } from "../challengeMetrics.js";

export type { ChallengeMetric } from "../challengeMetrics.js";

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
  ordersCount: number;
  sectorsCount: number;
  regionsCount: number;
  etfCount: number;
  blocksMastered: Record<string, number>;
  decisionsCount: number;
}

export interface MyClass {
  name: string;
  code: string;
}

export interface ClassChallenge {
  id: string;
  title: string;
  metric: ChallengeMetric;
  target: number;
  ref: string | null;
  endsAt: string | null;
}

export type WeekDayStatus = "future" | "today_open" | "completed" | "missed";

export interface DailyPlan {
  konzeptId: string | null;
  konzeptTitel: string | null;
  instrumentId: string | null;
  instrumentName: string | null;
  instrumentTicker: string | null;
  learningDone: boolean;
  marketViewed: boolean;
  decisionDone: boolean;
  woche: { date: string; status: WeekDayStatus }[];
}

export interface JournalEntry {
  id: string;
  action: "buy" | "sell" | "hold";
  instrumentId: string | null;
  quantity: number;
  reasonType: string;
  createdAt: string;
}

export interface LessonEntry {
  name: string;
  text: string;
  updatedAt: string;
}

export interface DividendEntry {
  id: string;
  instrumentId: string;
  amountCents: number;
  period: string;
  paidAt: string;
}

export interface HistoryPoint {
  asOf: string;
  valueCents: number;
}

export interface ChildSummary {
  profileId: string;
  displayName: string;
  completedCount: number;
  knowledgePoints: number;
  equityCents: number;
  performancePercent: number;
}

export interface FamilyDuelRow {
  profileId: string;
  displayName: string;
  role: Role;
  xpWeek: number;
  korrektWeek: number;
  tageWeek: number;
}

export interface PendingConsent {
  childProfileId: string;
  displayName: string;
  deadline: string | null;
  registeredAt: string;
}

interface Data {
  sessionUserId: string | null;
  profileId: string | null;
  role: Role;
  /** Einwilligungs-Status (Kinderkonten): approved | pending | blocked. */
  consentStatus: string;
  consentDeadline: string | null;
  displayName: string;
  plot: string;
  tutorialDone: boolean;
  cashCents: number;
  holdings: { instrumentId: string; quantity: number; avgCostCents: number }[];
  watchlist: string[];
  completedKonzepte: string[];
  lernXpGesamt: number;
  lernXpSaison: number;
  korrekteAntworten: number;
  learningCapitalCents: number;
  hasInvested: boolean;
  ordersCount: number;
  decisionsCount: number;
  instruments: Instrument[];
  prices: Map<string, number>;
  /** Zeitstempel des jüngsten Kurses (ISO) — für den „Kursstand"-Hinweis. */
  pricesAsOf: string | null;
  pendingLinks: PendingLink[];
  loading: boolean;
}

const EMPTY: Data = {
  sessionUserId: null,
  profileId: null,
  role: "child",
  consentStatus: "approved",
  consentDeadline: null,
  displayName: "",
  plot: "",
  tutorialDone: false,
  cashCents: 0,
  holdings: [],
  watchlist: [],
  completedKonzepte: [],
  lernXpGesamt: 0,
  lernXpSaison: 0,
  korrekteAntworten: 0,
  learningCapitalCents: 0,
  hasInvested: false,
  ordersCount: 0,
  decisionsCount: 0,
  instruments: [],
  prices: new Map(),
  pricesAsOf: null,
  pendingLinks: [],
  loading: true,
};


/** Version des Einwilligungstexts, die bei der Kind-Registrierung gespeichert wird. */
const CONSENT_TEXT_VERSION = "v1-2026-07";

/** Interne Alias-Domain fuer Kinderkonten (empfaengt nie Mails). */
const KIDS_ALIAS_DOMAIN = "kids.hofino.invalid";

/** Spitzname -> Alias-E-Mail (null, wenn der Spitzname zu wenig verwertbare Zeichen hat). */
export function kidsAlias(nickname: string): string | null {
  const slug = nickname
    .trim()
    .toLowerCase()
    .replaceAll("\u00e4", "ae")
    .replaceAll("\u00f6", "oe")
    .replaceAll("\u00fc", "ue")
    .replaceAll("\u00df", "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length >= 2 ? `${slug}@${KIDS_ALIAS_DOMAIN}` : null;
}

function plotKey(userId: string) {
  return `hofino:plot:${userId}`;
}

export type OrderOutcome = { ok: true } | { ok: false; reason: OrderError | "error" };
export type AuthOutcome = { ok: true } | { ok: false; message: string };

interface StoreApi {
  state: {
    onboarded: boolean;
    hasSession: boolean;
    /** Einwilligungs-Status des eigenen Profils (Kinderkonten). */
    consentStatus: string;
    consentDeadline: string | null;
    /** true, wenn der Nutzer ueber einen Passwort-Reset-Link kam. */
    passwordRecovery: boolean;
    loading: boolean;
    role: Role;
    profileId: string | null;
    displayName: string;
    plot: string;
    tutorialDone: boolean;
    portfolio: Portfolio;
    watchlist: string[];
    ordersCount: number;
    decisionsCount: number;
    pendingLinks: PendingLink[];
  };
  instruments: Instrument[];
  instrumentById: Map<string, Instrument>;
  prices: ReadonlyMap<string, number>;
  /** Zeitstempel des jüngsten Kurses (ISO) — für den „Kursstand"-Hinweis. */
  pricesAsOf: string | null;
  derived: {
    holdingsValueCents: number;
    equityCents: number;
    learningCapitalCents: number;
    performancePercent: number;
    houseStage: HouseStage;
    completedCount: number;
    lernXpGesamt: number;
    lernXpSaison: number;
    korrekteAntworten: number;
  };
  register: (name: string, plot: string, email: string, password: string, role: Role) => Promise<AuthOutcome>;
  login: (email: string, password: string) => Promise<AuthOutcome>;
  /** Sendet die Passwort-Reset-Mail (E-Mail-Rollen). */
  resetPassword: (email: string) => Promise<AuthOutcome>;
  /** Setzt nach dem Reset-Link das neue Passwort. */
  updatePassword: (password: string) => Promise<AuthOutcome>;
  /** Eltern: offene Einwilligungen fuer Kinder unter der eigenen E-Mail. */
  fetchPendingConsents: () => Promise<PendingConsent[]>;
  /** Eltern: Einwilligung bestaetigen (setzt approved + Family-Link). */
  confirmConsent: (childProfileId: string) => Promise<AuthOutcome>;
  /** Kind: Eltern-Mail erneut anfordern (Sweep verschickt sie neu). */
  requestConsentMail: () => Promise<AuthOutcome>;
  /** Eltern: legen ein Kinderkonto an (Einwilligung gilt als erteilt). */
  createChildAccount: (nickname: string, password: string) => Promise<AuthOutcome>;
  /** Eltern/Lehrkraft: setzen das Passwort eines verknuepften Kindes/Schuelers neu. */
  resetChildPassword: (childProfileId: string, password: string) => Promise<AuthOutcome>;
  /** Loescht das eigene Konto endgueltig (DSGVO / App-Store-Pflicht). */
  deleteAccount: () => Promise<AuthOutcome>;
  /** Eltern/Lehrkraft: loeschen ein verknuepftes Kind / Schueler:in der eigenen Klasse. */
  deleteChildAccount: (childProfileId: string) => Promise<AuthOutcome>;
  /** Familien-Duell: Wochenwertung ueber den Familienkreis (leer ohne Verknuepfung). */
  fetchFamilyDuel: () => Promise<FamilyDuelRow[]>;
  createProfile: (name: string, plot: string, role: Role) => Promise<AuthOutcome>;
  signOut: () => Promise<void>;
  completeTutorial: () => void;
  buy: (instrumentId: string, quantity: number, waiveFee?: boolean) => Promise<OrderOutcome>;
  sell: (instrumentId: string, quantity: number) => Promise<OrderOutcome>;
  toggleWatch: (instrumentId: string) => Promise<void>;
  linkChild: (childCode: string) => Promise<AuthOutcome>;
  respondToLink: (parentProfileId: string, approve: boolean) => Promise<void>;
  fetchFamily: () => Promise<ChildSummary[]>;
  createClass: (name: string, consent: boolean) => Promise<AuthOutcome & { code?: string }>;
  joinClass: (code: string) => Promise<AuthOutcome>;
  fetchTeacherClass: () => Promise<TeacherClass | null>;
  fetchClassOverview: (classId: string) => Promise<ClassOverviewRow[]>;
  fetchMyClass: () => Promise<MyClass | null>;
  fetchAssignments: (classId: string) => Promise<string[]>;
  assignKonzept: (classId: string, konzeptId: string) => Promise<void>;
  unassignKonzept: (classId: string, konzeptId: string) => Promise<void>;
  fetchMyAssignments: () => Promise<string[]>;
  fetchCurriculum: (classId: string) => Promise<Record<string, "freigegeben" | "gesperrt">>;
  setBlockRelease: (classId: string, themenblockId: string, released: boolean) => Promise<void>;
  setBlocksRelease: (classId: string, entries: { themenblockId: string; released: boolean }[]) => Promise<void>;
  fetchMyLockedBlocks: () => Promise<Set<string>>;
  fetchClassChallenges: (classId: string) => Promise<ClassChallenge[]>;
  createChallenge: (classId: string, metric: ChallengeMetric, target: number, title: string, ref?: string | null, endsAt?: string | null) => Promise<void>;
  deleteChallenge: (id: string) => Promise<void>;
  fetchMyChallenges: () => Promise<ClassChallenge[]>;
  fetchClassXp: () => Promise<number>;
  fetchMyLesson: () => Promise<string>;
  saveLesson: (text: string) => Promise<{ ok: boolean; reason?: string }>;
  fetchClassLessons: (classId: string) => Promise<LessonEntry[]>;
  fetchDailyPlan: () => Promise<DailyPlan | null>;
  markMarketViewed: () => Promise<void>;
  submitDecision: (
    action: "buy" | "sell" | "hold",
    quantity: number,
    reason: string,
    reasonText?: string,
  ) => Promise<{ ok: boolean; reason?: string; xp?: number }>;
  fetchDecisionJournal: () => Promise<JournalEntry[]>;
  fetchDividends: () => Promise<DividendEntry[]>;
  fetchPriceHistory: (instrumentId: string) => Promise<HistoryPoint[]>;
  fetchPortfolioHistory: () => Promise<HistoryPoint[]>;
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(EMPTY);
  // Nutzer kam über einen Passwort-Reset-Link → Gate zeigt den Neues-Passwort-Screen.
  const [passwordRecovery, setPasswordRecovery] = useState(false);
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
        // Zwei Test-Nutzergruppen mit unterschiedlichen Passwörtern: Cockpit-Seeds
        // (hofino-dev-123) und DevLogin-Personas (hofino-dev-2026). Beide probieren;
        // Fehlschlag sichtbar loggen statt still zu scheitern (Review P2-18).
        for (const password of ["hofino-dev-123", "hofino-dev-2026"]) {
          const r = await supabase.auth.signInWithPassword({ email, password });
          if (!r.error) {
            ({ data: auth } = await supabase.auth.getUser());
            user = auth.user;
            break;
          }
        }
        if (!user) console.warn("[devlogin] Anmeldung fehlgeschlagen für", email);
      }
    }
    if (!user) {
      setData({ ...EMPTY, loading: false });
      return;
    }

    const profileRes = await supabase
      .from("profiles")
      .select("id, role, display_name, tutorial_done, consent_status, consent_deadline")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profileRes.data) {
      setData({ ...EMPTY, sessionUserId: user.id, profileId: null, loading: false });
      return;
    }
    const profileId = profileRes.data.id as string;

    // Fällige Dividenden des aktuellen Monats gutschreiben, BEVOR Cash/Depot gelesen wird
    // (idempotent serverseitig; nur Spieler-Rollen haben ein Depot).
    if (profileRes.data.role !== "parent" && profileRes.data.role !== "teacher") {
      await supabase.rpc("dividenden_nachzahlen");
    }

    const [instrumentsRes, pricesRes, portfolioRes, holdingsRes, watchRes, grantsRes, ordersRes, pendingRes, fortschrittRes, statusRes, korrektRes, decisionsRes] =
      await Promise.all([
        supabase.from("instruments").select("id, ticker, name, type, sector, country"),
        supabase.from("prices").select("instrument_id, price_cents, as_of"),
        supabase.from("portfolios").select("cash_cents").eq("owner_profile_id", profileId).maybeSingle(),
        supabase.from("holdings").select("instrument_id, quantity, avg_cost_cents"),
        supabase.from("watchlist").select("instrument_id"),
        supabase.from("capital_grants").select("amount_cents"),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase
          .from("parent_child_links")
          .select("parent_profile_id")
          .eq("child_profile_id", profileId)
          .eq("status", "pending"),
        supabase.from("lern_konzept_fortschritt").select("konzept_id, hoechste_abgeschlossene_stufe"),
        supabase.from("lern_status").select("xp_gesamt, xp_saison").eq("profile_id", profileId).maybeSingle(),
        supabase.from("lern_antworten").select("id", { count: "exact", head: true }).eq("korrekt", true),
        supabase.from("trade_decisions").select("id", { count: "exact", head: true }),
      ]);

    const role = (profileRes.data.role as Role) ?? "child";
    const isPlayer = role !== "parent" && role !== "teacher"; // diese Rollen haben kein eigenes Depot.

    const prices = new Map<string, number>();
    let pricesAsOf: string | null = null;
    for (const p of pricesRes.data ?? []) {
      prices.set(p.instrument_id, p.price_cents);
      if (p.as_of && (!pricesAsOf || p.as_of > pricesAsOf)) pricesAsOf = p.as_of as string;
    }

    setData({
      sessionUserId: user.id,
      profileId,
      role,
      consentStatus: (profileRes.data.consent_status as string) ?? "approved",
      consentDeadline: (profileRes.data.consent_deadline as string | null) ?? null,
      displayName: (profileRes.data.display_name as string) ?? "",
      plot: globalThis.localStorage?.getItem(plotKey(user.id)) ?? "",
      tutorialDone: Boolean(profileRes.data.tutorial_done),
      cashCents: isPlayer ? portfolioRes.data?.cash_cents ?? 0 : 0,
      holdings: isPlayer
        ? (holdingsRes.data ?? []).map((h) => ({
            instrumentId: h.instrument_id,
            quantity: h.quantity,
            avgCostCents: h.avg_cost_cents,
          }))
        : [],
      watchlist: isPlayer ? (watchRes.data ?? []).map((w) => w.instrument_id) : [],
      completedKonzepte: isPlayer
        ? (fortschrittRes.data ?? [])
            .filter((r) => r.hoechste_abgeschlossene_stufe === "meistern")
            .map((r) => r.konzept_id)
        : [],
      lernXpGesamt: isPlayer ? Number(statusRes.data?.xp_gesamt ?? 0) : 0,
      lernXpSaison: isPlayer ? Number(statusRes.data?.xp_saison ?? 0) : 0,
      korrekteAntworten: isPlayer ? korrektRes.count ?? 0 : 0,
      learningCapitalCents: isPlayer ? (grantsRes.data ?? []).reduce((s, r) => s + r.amount_cents, 0) : 0,
      hasInvested: isPlayer ? (ordersRes.count ?? 0) > 0 : false,
      ordersCount: isPlayer ? ordersRes.count ?? 0 : 0,
      decisionsCount: isPlayer ? decisionsRes.count ?? 0 : 0,
      instruments: (instrumentsRes.data ?? []) as Instrument[],
      prices,
      pricesAsOf,
      pendingLinks: (pendingRes.data ?? []).map((r) => ({ parentProfileId: r.parent_profile_id })),
      loading: false,
    });
    // Tages-Snapshot des Depotwerts festhalten (idempotent), damit die Wertkurve wächst.
    if (isPlayer) void supabase.rpc("capture_portfolio_snapshot");
   } catch {
     // Netzwerk/Backend kurz nicht erreichbar → Sitzung NICHT verwerfen: bestehende
     // Daten behalten, nur den Ladezustand beenden. (Vorher warf ein einzelner
     // fehlgeschlagener Reload den eingeloggten Nutzer auf den Login-Screen zurück.)
     setData((prev) => ({ ...prev, loading: false }));
   }
  }, []);

  useEffect(() => {
    load();
    // Eingeladene Eltern (Invite-Mail) sollen zuerst ein Passwort setzen.
    try {
      if (globalThis.location?.hash.includes("type=invite")) setPasswordRecovery(true);
    } catch {
      // ignorieren
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const register = useCallback<StoreApi["register"]>(
    async (name, plot, email, password, role) => {
      // Schueler: Registrierung ueber den Schulweg (Edge Function prueft den
      // Klassencode + Schul-Einwilligung); `email` ist hier der KLASSENCODE.
      if (role === "student") {
        const { error: fnError } = await supabase.functions.invoke("register-student", {
          body: { nickname: name, password, classCode: email },
        });
        if (fnError) {
          let code = fnError.message;
          const ctx = (fnError as { context?: Response }).context;
          if (ctx && typeof ctx.json === "function") {
            try {
              code = ((await ctx.json()) as { error?: string }).error ?? code;
            } catch {
              // Body nicht lesbar
            }
          }
          const map: Record<string, string> = {
            nickname_taken: t("auth.nicknameTaken"),
            bad_nickname: t("auth.badNickname"),
            class_not_found: t("auth.classNotFound"),
            class_without_consent: t("auth.classNotFound"),
          };
          return { ok: false, message: map[code] ?? code };
        }
        const aliasLogin = kidsAlias(name);
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: aliasLogin ?? "",
          password,
        });
        if (loginError) return { ok: false, message: loginError.message };
        await load();
        return { ok: true };
      }
      // Kinder melden sich ohne eigene E-Mail an: der Spitzname wird zu einem
      // internen Alias (empfaengt nie Mails); `email` ist hier die Eltern-E-Mail.
      const isChild = role === "child";
      const authEmail = isChild ? kidsAlias(name) : email;
      if (isChild && !authEmail) return { ok: false, message: t("auth.badNickname") };
      const { data: res, error } = await supabase.auth.signUp({ email: authEmail!, password });
      if (error) {
        const taken = /already registered|already exists/i.test(error.message);
        return { ok: false, message: isChild && taken ? t("auth.nicknameTaken") : error.message };
      }
      const user = res.user;
      if (!user) return { ok: false, message: "Keine Session erhalten." };
      // GoTrue meldet bei existierender E-Mail u.U. einen Fake-User ohne Identitaeten.
      if (isChild && Array.isArray((user as { identities?: unknown[] }).identities) && (user as { identities?: unknown[] }).identities!.length === 0) {
        return { ok: false, message: t("auth.nicknameTaken") };
      }
      // Mit aktivierter E-Mail-Bestätigung liefert signUp einen User OHNE Session — der
      // Profil-Insert würde an RLS scheitern und das Auth-Konto verwaist zurücklassen.
      // Stattdessen sauber informieren; das Profil entsteht nach dem ersten Login (ProfileSetup).
      if (!res.session) {
        return { ok: false, message: "Fast geschafft! Bitte bestätige zuerst deine E-Mail-Adresse und melde dich dann an." };
      }
      const ins = await supabase.from("profiles").insert(
        isChild
          ? {
              auth_user_id: user.id,
              role,
              display_name: name,
              // Der Insert-Trigger erzwingt pending + Frist serverseitig; hier nur die Zusatzdaten.
              consent_parent_email: email,
              consent_text_version: CONSENT_TEXT_VERSION,
            }
          : { auth_user_id: user.id, role, display_name: name }
      );
      if (ins.error) return { ok: false, message: ins.error.message };
      try {
        globalThis.localStorage?.setItem(plotKey(user.id), plot);
      } catch {
        // ignorieren
      }
      await load();
      return { ok: true };
    },
    [load, t]
  );

  const createProfile = useCallback<StoreApi["createProfile"]>(
    async (name, plot, role) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return { ok: false, message: t("store.notLoggedIn") };
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
    [load, t]
  );

  const login = useCallback<StoreApi["login"]>(
    async (email, password) => {
      // Eingabe ohne @ = Spitzname eines Kindes -> interner Alias.
      const authEmail = email.includes("@") ? email : (kidsAlias(email) ?? email);
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
      if (error) return { ok: false, message: error.message };
      await load();
      return { ok: true };
    },
    [load]
  );

  const resetPassword = useCallback<StoreApi["resetPassword"]>(async (email) => {
    // Web: zurueck zur App-URL (Pages laeuft unter /Hofino/); nativ uebernimmt das Deep-Linking spaeter.
    const redirectTo =
      globalThis.location ? globalThis.location.origin + globalThis.location.pathname : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }, []);

  const updatePassword = useCallback<StoreApi["updatePassword"]>(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, message: error.message };
    setPasswordRecovery(false);
    return { ok: true };
  }, []);

  const fetchPendingConsents = useCallback<StoreApi["fetchPendingConsents"]>(async () => {
    const { data: rows, error } = await supabase.rpc("offene_einwilligungen");
    if (error || !rows) return [];
    return (rows as { child_profile_id: string; display_name: string; deadline: string | null; registered_at: string }[]).map((r) => ({
      childProfileId: r.child_profile_id,
      displayName: r.display_name,
      deadline: r.deadline,
      registeredAt: r.registered_at,
    }));
  }, []);

  const confirmConsent = useCallback<StoreApi["confirmConsent"]>(async (childProfileId) => {
    const { error } = await supabase.rpc("einwilligung_bestaetigen", { p_child: childProfileId });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }, []);

  const requestConsentMail = useCallback<StoreApi["requestConsentMail"]>(async () => {
    const { error } = await supabase.rpc("einwilligung_mail_anfordern");
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }, []);

  const familyAdmin = useCallback(async (payload: Record<string, string>): Promise<AuthOutcome> => {
    const { error } = await supabase.functions.invoke("family-admin", { body: payload });
    if (!error) return { ok: true };
    // Fehlercode aus dem Response-Body ziehen (FunctionsHttpError traegt den Response-Kontext).
    let code = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        code = ((await ctx.json()) as { error?: string }).error ?? code;
      } catch {
        // Body nicht lesbar -> generische Meldung
      }
    }
    const map: Record<string, string> = {
      nickname_taken: t("auth.nicknameTaken"),
      bad_nickname: t("auth.badNickname"),
      weak_password: t("auth.password"),
    };
    return { ok: false, message: map[code] ?? code };
  }, [t]);

  const createChildAccount = useCallback<StoreApi["createChildAccount"]>(
    (nickname, password) => familyAdmin({ action: "create_child", nickname, password }),
    [familyAdmin]
  );

  const resetChildPassword = useCallback<StoreApi["resetChildPassword"]>(
    (childProfileId, password) => familyAdmin({ action: "reset_child_password", childProfileId, password }),
    [familyAdmin]
  );

  const deleteAccount = useCallback<StoreApi["deleteAccount"]>(async () => {
    const r = await familyAdmin({ action: "delete_self" });
    if (r.ok) await supabase.auth.signOut();
    return r;
  }, [familyAdmin]);

  const deleteChildAccount = useCallback<StoreApi["deleteChildAccount"]>(
    (childProfileId) => familyAdmin({ action: "delete_child", childProfileId }),
    [familyAdmin]
  );

  const fetchFamilyDuel = useCallback<StoreApi["fetchFamilyDuel"]>(async () => {
    const { data: rows, error } = await supabase.rpc("familien_duell");
    if (error || !rows) return [];
    return (rows as { profile_id: string; display_name: string; role: Role; xp_week: number; korrekt_week: number; tage_week: number }[]).map((r) => ({
      profileId: r.profile_id,
      displayName: r.display_name,
      role: r.role,
      xpWeek: Number(r.xp_week),
      korrektWeek: Number(r.korrekt_week),
      tageWeek: Number(r.tage_week),
    }));
  }, []);

  const signOut = useCallback(async () => {
    setPasswordRecovery(false);
    await supabase.auth.signOut();
    setData({ ...EMPTY, loading: false });
  }, []);

  const completeTutorial = useCallback<StoreApi["completeTutorial"]>(() => {
    // Optimistisch ausblenden und serverseitig dauerhaft merken (überlebt Reload,
    // Gerätewechsel und native Clients). RLS erlaubt das Schreiben des eigenen Profils.
    setData((d) => ({ ...d, tutorialDone: true }));
    const profileId = dataRef.current.profileId;
    if (profileId) {
      // .then() erzwingt die Ausführung – der Supabase-Builder feuert sonst nicht.
      void supabase
        .from("profiles")
        .update({ tutorial_done: true })
        .eq("id", profileId)
        .then(() => {}, () => {});
    }
  }, []);

  const order = useCallback(
    async (instrumentId: string, quantity: number, side: "buy" | "sell", waiveFee = false): Promise<OrderOutcome> => {
      try {
        const { data: res, error } = await supabase.rpc("place_order", {
          p_instrument: instrumentId,
          p_side: side,
          p_qty: quantity,
          p_waive_fee: waiveFee,
        });
        if (error) return { ok: false, reason: "error" };
        if (!res?.ok) return { ok: false, reason: (res?.reason as OrderError) ?? "error" };
        await load();
        return { ok: true };
      } catch {
        // Netzwerk/Backend nicht erreichbar (z. B. „Failed to fetch") → als Fehler
        // melden statt still zu scheitern, sonst wirkt der Kauf-Button wirkungslos.
        return { ok: false, reason: "error" };
      }
    },
    [load]
  );

  const toggleWatch = useCallback<StoreApi["toggleWatch"]>(
    async (instrumentId) => {
      const { profileId, watchlist } = dataRef.current;
      if (!profileId) return;
      try {
        if (watchlist.includes(instrumentId)) {
          await supabase.from("watchlist").delete().eq("profile_id", profileId).eq("instrument_id", instrumentId);
        } else {
          await supabase.from("watchlist").insert({ profile_id: profileId, instrument_id: instrumentId });
        }
        await load();
      } catch {
        // Netzwerk/Backend nicht erreichbar → nicht abstürzen; Zustand unverändert lassen.
      }
    },
    [load]
  );

  const linkChild = useCallback<StoreApi["linkChild"]>(async (childCode) => {
    const profileId = dataRef.current.profileId;
    if (!profileId) return { ok: false, message: t("store.notLoggedIn") };
    const code = childCode.trim();
    if (code === profileId) return { ok: false, message: t("store.ownCode") };
    const ins = await supabase
      .from("parent_child_links")
      .insert({ parent_profile_id: profileId, child_profile_id: code, status: "pending" });
    if (ins.error) return { ok: false, message: t("store.codeInvalid") };
    return { ok: true };
  }, [t]);

  const respondToLink = useCallback<StoreApi["respondToLink"]>(
    async (parentProfileId, approve) => {
      try {
        await supabase.rpc("respond_to_parent_link", { p_parent: parentProfileId, p_approve: approve });
        await load();
      } catch {
        // Netzwerk/Backend nicht erreichbar → nicht abstürzen.
      }
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

    const [profilesRes, portfoliosRes, holdingsRes, fortschrittRes, statusRes, grantsRes] = await Promise.all([
      supabase.from("profiles").select("id, display_name").in("id", childIds),
      supabase.from("portfolios").select("id, owner_profile_id, cash_cents").in("owner_profile_id", childIds),
      supabase.from("holdings").select("portfolio_id, instrument_id, quantity"),
      supabase.from("lern_konzept_fortschritt").select("profile_id, hoechste_abgeschlossene_stufe").in("profile_id", childIds),
      supabase.from("lern_status").select("profile_id, xp_gesamt").in("profile_id", childIds),
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
    // Abgeschlossene Konzepte = Stufe 'meistern' (identische Definition wie Schüler-Lerntab/class_overview).
    const completedByChild = new Map<string, number>();
    for (const f of fortschrittRes.data ?? []) {
      if (f.hoechste_abgeschlossene_stufe === "meistern")
        completedByChild.set(f.profile_id, (completedByChild.get(f.profile_id) ?? 0) + 1);
    }
    // Wissenspunkte = lern_status.xp_gesamt (eine Zeile je Profil).
    const pointsByChild = new Map<string, number>();
    for (const r of statusRes.data ?? []) pointsByChild.set(r.profile_id, Number(r.xp_gesamt ?? 0));
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

  const createClass = useCallback<StoreApi["createClass"]>(async (name, consent) => {
    try {
      const { data: res, error } = await supabase.rpc("create_class", { p_name: name, p_consent: consent });
      if (error) return { ok: false, message: error.message };
      if (!res?.ok) return { ok: false, message: res?.reason ?? t("store.genericError") };
      return { ok: true, code: res.class_code as string };
    } catch {
      return { ok: false, message: t("store.genericError") };
    }
  }, [t]);

  const joinClass = useCallback<StoreApi["joinClass"]>(
    async (code) => {
      try {
        const { data: res, error } = await supabase.rpc("join_class", { p_code: code });
        if (error) return { ok: false, message: error.message };
        if (!res?.ok)
          return { ok: false, message: res?.reason === "not_found" ? t("store.codeNotFound") : t("store.genericError") };
        await load();
        return { ok: true };
      } catch {
        return { ok: false, message: t("store.genericError") };
      }
    },
    [load, t]
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
      ordersCount: Number(r.orders_count ?? 0),
      sectorsCount: Number(r.sectors_count ?? 0),
      regionsCount: Number(r.regions_count ?? 0),
      etfCount: Number(r.etf_count ?? 0),
      blocksMastered: (r.blocks_mastered as Record<string, number>) ?? {},
      decisionsCount: Number(r.decisions_count ?? 0),
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
    // Serverfehler (RLS/Constraint) werfen, damit das optimistische UI zurückrollen kann —
    // supabase-js wirft selbst nur bei Netzwerkausfall.
    const { error } = await supabase.from("class_assignments").insert({ class_id: classId, konzept_id: konzeptId });
    if (error) throw error;
  }, []);

  const unassignKonzept = useCallback<StoreApi["unassignKonzept"]>(async (classId, konzeptId) => {
    const { error } = await supabase.from("class_assignments").delete().eq("class_id", classId).eq("konzept_id", konzeptId);
    if (error) throw error;
  }, []);

  // Schüler: vom Lehrer zugewiesene Konzepte (RLS liefert nur die eigene Klasse).
  const fetchMyAssignments = useCallback<StoreApi["fetchMyAssignments"]>(async () => {
    const { data } = await supabase.from("class_assignments").select("konzept_id");
    return (data ?? []).map((r) => r.konzept_id as string);
  }, []);

  // Klassen-Curriculum: Lehrkraft steuert je Themenblock (freigegeben/gesperrt).
  // Standard = offen; nur explizit 'gesperrt' pausiert die neue Erstbearbeitung.
  const fetchCurriculum = useCallback<StoreApi["fetchCurriculum"]>(async (classId) => {
    const { data } = await supabase
      .from("class_curriculum")
      .select("themenblock_id, status")
      .eq("class_id", classId);
    const map: Record<string, "freigegeben" | "gesperrt"> = {};
    for (const r of data ?? []) map[r.themenblock_id as string] = r.status as "freigegeben" | "gesperrt";
    return map;
  }, []);

  const setBlockRelease = useCallback<StoreApi["setBlockRelease"]>(async (classId, themenblockId, released) => {
    const { error } = await supabase.from("class_curriculum").upsert(
      {
        class_id: classId,
        themenblock_id: themenblockId,
        status: released ? "freigegeben" : "gesperrt",
        gesetzt_am: new Date().toISOString(),
        gesetzt_von: dataRef.current.profileId,
      },
      { onConflict: "class_id,themenblock_id" },
    );
    if (error) throw error;
  }, []);

  // Mehrere Blöcke in einem Rutsch setzen (für den Voraussetzungs-Schutz: Block +
  // transitive Voraussetzungen/Abhängige zusammen freigeben bzw. sperren).
  const setBlocksRelease = useCallback<StoreApi["setBlocksRelease"]>(async (classId, entries) => {
    if (entries.length === 0) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("class_curriculum").upsert(
      entries.map((e) => ({
        class_id: classId,
        themenblock_id: e.themenblockId,
        status: e.released ? "freigegeben" : "gesperrt",
        gesetzt_am: now,
        gesetzt_von: dataRef.current.profileId,
      })),
      { onConflict: "class_id,themenblock_id" },
    );
    if (error) throw error;
  }, []);

  // Schüler-Sicht: Menge der aktuell GESPERRTEN Themenblöcke der eigenen Klasse (RLS-gefiltert).
  const fetchMyLockedBlocks = useCallback<StoreApi["fetchMyLockedBlocks"]>(async () => {
    const { data } = await supabase.from("class_curriculum").select("themenblock_id, status").eq("status", "gesperrt");
    return new Set((data ?? []).map((r) => r.themenblock_id as string));
  }, []);

  // Klassen-Challenges: messbares Ziel (Konzepte/XP). RLS regelt Lehrer-Schreiben/Mitglied-Lesen.
  // Klassen-Challenges: messbares Ziel (Lernen/Depot/kooperativ). RLS regelt Lehrer-Schreiben/Mitglied-Lesen.
  const mapChallenge = (r: {
    id: string;
    title: string;
    goal_metric: string | null;
    goal_target: number | null;
    goal_ref: string | null;
    ends_at: string | null;
  }): ClassChallenge => ({
    id: r.id,
    title: r.title,
    metric: (r.goal_metric as ChallengeMetric) ?? "konzepte",
    target: r.goal_target ?? 0,
    ref: r.goal_ref ?? null,
    endsAt: r.ends_at ?? null,
  });

  const fetchClassChallenges = useCallback<StoreApi["fetchClassChallenges"]>(async (classId) => {
    const { data } = await supabase
      .from("challenges")
      .select("id, title, goal_metric, goal_target, goal_ref, ends_at")
      .eq("class_id", classId)
      .eq("scope", "class")
      .order("created_at", { ascending: true });
    return (data ?? []).map(mapChallenge);
  }, []);

  const createChallenge = useCallback<StoreApi["createChallenge"]>(async (classId, metric, target, title, ref, endsAt) => {
    try {
      await supabase.from("challenges").insert({
        scope: "class",
        class_id: classId,
        title,
        goal_metric: metric,
        goal_target: target,
        goal_ref: ref ?? null,
        starts_at: new Date().toISOString(),
        ends_at: endsAt ?? null,
        created_by: dataRef.current.profileId,
      });
    } catch {
      // Netzwerk/Backend nicht erreichbar → nicht abstürzen.
    }
  }, []);

  const deleteChallenge = useCallback<StoreApi["deleteChallenge"]>(async (id) => {
    try {
      await supabase.from("challenges").delete().eq("id", id);
    } catch {
      // Netzwerk/Backend nicht erreichbar → nicht abstürzen.
    }
  }, []);

  // Schüler: Challenges der eigenen Klasse (RLS liefert nur die eigene Klasse).
  const fetchMyChallenges = useCallback<StoreApi["fetchMyChallenges"]>(async () => {
    const { data } = await supabase
      .from("challenges")
      .select("id, title, goal_metric, goal_target, goal_ref, ends_at")
      .eq("scope", "class")
      .order("created_at", { ascending: true });
    return (data ?? []).map(mapChallenge);
  }, []);

  // Summe der Klassen-XP (Schüler-Sicht auf das kooperative Ziel); 0 falls keine Klasse.
  const fetchClassXp = useCallback<StoreApi["fetchClassXp"]>(async () => {
    const { data } = await supabase.rpc("lern_klassen_xp");
    return data?.ok ? Number(data.sum ?? 0) : 0;
  }, []);

  // Lessons Learned: Schüler liest/speichert eigene Reflexion; Lehrer liest die der Klasse.
  const fetchMyLesson = useCallback<StoreApi["fetchMyLesson"]>(async () => {
    const { data } = await supabase.from("lessons_learned").select("text").maybeSingle();
    return (data?.text as string) ?? "";
  }, []);

  const saveLesson = useCallback<StoreApi["saveLesson"]>(async (text) => {
    const { data } = await supabase.rpc("lektion_speichern", { p_text: text });
    return { ok: !!data?.ok, reason: data?.reason as string | undefined };
  }, []);

  const fetchClassLessons = useCallback<StoreApi["fetchClassLessons"]>(async (classId) => {
    const { data } = await supabase.rpc("class_lektionen", { p_class_id: classId });
    return (data ?? []).map((r: { display_name: string; text: string; updated_at: string }) => ({
      name: r.display_name,
      text: r.text,
      updatedAt: r.updated_at,
    }));
  }, []);

  // Daily Finance Workout: Tagesplan holen/erzeugen, Schritte markieren.
  const fetchDailyPlan = useCallback<StoreApi["fetchDailyPlan"]>(async () => {
    const { data, error } = await supabase.rpc("tagesplan_heute");
    if (error || !data?.ok) return null;
    const d = data as Record<string, unknown>;
    return {
      konzeptId: (d.konzept_id as string) ?? null,
      konzeptTitel: (d.konzept_titel as string) ?? null,
      instrumentId: (d.instrument_id as string) ?? null,
      instrumentName: (d.instrument_name as string) ?? null,
      instrumentTicker: (d.instrument_ticker as string) ?? null,
      learningDone: Boolean(d.learning_done),
      marketViewed: Boolean(d.market_viewed),
      decisionDone: Boolean(d.decision_done),
      woche: ((d.woche as { date: string; status: WeekDayStatus }[]) ?? []),
    };
  }, []);

  const markMarketViewed = useCallback<StoreApi["markMarketViewed"]>(async () => {
    try {
      await supabase.rpc("tagesplan_markt_gesehen");
    } catch {
      // Netzwerk/Backend nicht erreichbar → nicht abstürzen.
    }
  }, []);

  const submitDecision = useCallback<StoreApi["submitDecision"]>(async (action, quantity, reason, reasonText) => {
    const { data, error } = await supabase.rpc("tagesentscheidung_speichern", {
      p_action: action,
      p_quantity: quantity,
      p_reason: reason,
      p_reason_text: reasonText ?? null,
    });
    if (error) return { ok: false, reason: error.message };
    const d = data as { ok: boolean; reason?: string; xp?: number };
    if (d?.ok) await load();
    return { ok: Boolean(d?.ok), reason: d?.reason, xp: d?.xp };
  }, [load]);

  const fetchDecisionJournal = useCallback<StoreApi["fetchDecisionJournal"]>(async () => {
    const { data } = await supabase
      .from("trade_decisions")
      .select("id, action, instrument_id, quantity, reason_type, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      action: r.action as "buy" | "sell" | "hold",
      instrumentId: (r.instrument_id as string) ?? null,
      quantity: Number(r.quantity ?? 0),
      reasonType: r.reason_type as string,
      createdAt: r.created_at as string,
    }));
  }, []);

  const fetchDividends = useCallback<StoreApi["fetchDividends"]>(async () => {
    const { data } = await supabase
      .from("dividend_payments")
      .select("id, instrument_id, amount_cents, period, paid_at")
      .order("paid_at", { ascending: false })
      .limit(20);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      instrumentId: r.instrument_id as string,
      amountCents: Number(r.amount_cents ?? 0),
      period: r.period as string,
      paidAt: r.paid_at as string,
    }));
  }, []);

  // Kursverlauf eines Instruments (älteste → neueste) für den Detail-Chart.
  const fetchPriceHistory = useCallback<StoreApi["fetchPriceHistory"]>(async (instrumentId) => {
    const { data } = await supabase
      .from("price_snapshots")
      .select("price_cents, as_of")
      .eq("instrument_id", instrumentId)
      .order("as_of", { ascending: false })
      .limit(60);
    return (data ?? [])
      .map((r) => ({ asOf: r.as_of as string, valueCents: Number(r.price_cents ?? 0) }))
      .reverse();
  }, []);

  // Depotwert über Zeit (älteste → neueste) für den Depot-Chart.
  const fetchPortfolioHistory = useCallback<StoreApi["fetchPortfolioHistory"]>(async () => {
    const { data } = await supabase
      .from("portfolio_snapshots")
      .select("total_value_cents, as_of")
      .order("as_of", { ascending: false })
      .limit(90);
    return (data ?? [])
      .map((r) => ({ asOf: r.as_of as string, valueCents: Number(r.total_value_cents ?? 0) }))
      .reverse();
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
    data.hasInvested,
    data.lernXpGesamt,
    data.lernXpSaison,
    data.korrekteAntworten,
  ]);

  const api: StoreApi = {
    state: {
      onboarded: data.profileId !== null,
      hasSession: data.sessionUserId !== null,
      consentStatus: data.consentStatus,
      consentDeadline: data.consentDeadline,
      passwordRecovery,
      loading: data.loading,
      role: data.role,
      profileId: data.profileId,
      displayName: data.displayName,
      plot: data.plot,
      tutorialDone: data.tutorialDone,
      portfolio,
      watchlist: data.watchlist,
      ordersCount: data.ordersCount,
      decisionsCount: data.decisionsCount,
      pendingLinks: data.pendingLinks,
    },
    instruments: data.instruments,
    instrumentById,
    prices: data.prices,
    pricesAsOf: data.pricesAsOf,
    derived,
    register,
    login,
    resetPassword,
    updatePassword,
    fetchPendingConsents,
    confirmConsent,
    requestConsentMail,
    createChildAccount,
    resetChildPassword,
    deleteAccount,
    deleteChildAccount,
    fetchFamilyDuel,
    createProfile,
    signOut,
    completeTutorial,
    buy: (id, qty, waiveFee) => order(id, qty, "buy", waiveFee),
    sell: (id, qty) => order(id, qty, "sell"),
    toggleWatch,
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
    fetchCurriculum,
    setBlockRelease,
    setBlocksRelease,
    fetchMyLockedBlocks,
    fetchClassChallenges,
    createChallenge,
    deleteChallenge,
    fetchMyChallenges,
    fetchClassXp,
    fetchMyLesson,
    saveLesson,
    fetchClassLessons,
    fetchDailyPlan,
    markMarketViewed,
    submitDecision,
    fetchDecisionJournal,
    fetchDividends,
    fetchPriceHistory,
    fetchPortfolioHistory,
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
