// Kinderschutz-Guard: prüft kindgerichtete Inhalte gegen harte Leitplanken (CLAUDE.md §2/§3).
// Im Kindermodus: keine externen Links, keine Brokerhinweise, keine Anlageempfehlungen, kein Chat.
// Geprüft werden die real angezeigten Inhalte: Lern-Inhalte (@hofino/learning SEED, v2-Direktfelder)
// + Profile. Review 2026-07-10: Muster gegen False-Negatives geschärft, v2-Felder ergänzt.
import { SEED, V2_MODULES, type LangText } from "@hofino/learning";
import { COMPANY_PROFILES, ETF_PROFILES } from "./profiles.js";

export interface ForbiddenRule {
  pattern: RegExp;
  label: string;
}

export const FORBIDDEN_RULES: ForbiddenRule[] = [
  // www.-Links ohne Protokoll zählen ebenfalls als externer Link.
  { pattern: /https?:\/\/|\bwww\./i, label: "Externer Link (keine Brokerlinks im Kindermodus)" },
  // "broker" ohne Wortgrenze fängt auch "Neobroker"/"Onlinebroker";
  // "Depot bei/eröffnen" in beiden Wortstellungen.
  { pattern: /broker|depot\s+(bei\b|er[öo]ffn)|er[öo]ffn\w*\s+(dein|ein)\s+depot/i, label: "Brokerhinweis" },
  { pattern: /kaufempfehlung|anlageempfehlung|kauf-?tipp/i, label: "Anlageempfehlung" },
  // Fenster 60 Zeichen (24 war für reale Sätze zu kurz); "wir raten" und "ihr solltet" ergänzt.
  {
    pattern: /\bkauf(e|en) sie\b|\bwir empfehlen\b|\bwir raten\b|\b(du|ihr) solltes?t\b.{0,60}\b(kaufen|verkaufen)\b/i,
    label: "Empfehlende Aufforderung",
  },
  { pattern: /\bchat\b|direktnachricht|kommentarfunktion/i, label: "Chat/Direktnachricht" },
];

export interface Violation {
  where: string;
  label: string;
  excerpt: string;
}

export function checkText(where: string, text: string): Violation[] {
  const out: Violation[] = [];
  for (const rule of FORBIDDEN_RULES) {
    const m = rule.pattern.exec(text);
    if (m) out.push({ where, label: rule.label, excerpt: m[0] });
  }
  return out;
}

/** Prüft beide Sprachvarianten eines mehrsprachigen Textes (en nur, falls gepflegt). */
function checkLang(where: string, t: LangText): Violation[] {
  const out = checkText(where, t.de);
  if (t.en) out.push(...checkText(`${where}.en`, t.en));
  return out;
}

/** Prüft alle kindgerichteten Inhalte (Lern-Inhalte + Profile) und liefert gefundene Verstöße. */
export function auditChildContent(): Violation[] {
  const v: Violation[] = [];

  for (const tb of SEED.themenbloecke) {
    v.push(...checkLang(`block:${tb.id}.titel`, tb.titel));
  }
  for (const k of SEED.konzepte) {
    v.push(...checkLang(`konzept:${k.id}.titel`, k.titel));
    for (const [band, txt] of Object.entries(k.erklaerungen)) {
      v.push(...checkLang(`konzept:${k.id}.erklaerung.${band}`, txt));
    }
  }
  for (const f of SEED.fragen) {
    v.push(...checkLang(`frage:${f.id}.frage`, f.frage));
    v.push(...checkLang(`frage:${f.id}.korrekt`, f.korrekte_antwort));
    v.push(...checkLang(`frage:${f.id}.erklaerung`, f.erklaerung_nach_antwort));
    f.distraktor_pool.forEach((d, i) => v.push(...checkLang(`frage:${f.id}.distraktor${i}`, d.text)));
  }
  for (const vo of SEED.vorlagen) {
    v.push(...checkLang(`vorlage:${vo.id}.frage`, vo.frage_vorlage));
    if (vo.erklaerung_nach_antwort) {
      v.push(...checkLang(`vorlage:${vo.id}.erklaerung`, vo.erklaerung_nach_antwort));
    }
  }

  for (const p of COMPANY_PROFILES) {
    for (const [k, val] of Object.entries(p)) v.push(...checkText(`company:${p.ticker}.${k}`, String(val)));
  }
  for (const p of ETF_PROFILES) {
    for (const [k, val] of Object.entries(p)) if (val) v.push(...checkText(`etf:${p.ticker}.${k}`, String(val)));
  }

  // v2-Direktfelder, die NICHT über die Legacy-Bridge laufen (vorher blinder Fleck):
  // young_adults-Erklärung, Pädagogik-Felder (Transfer-/Reflexionsaufgaben sehen Lernende),
  // Glossarbegriffe sowie Lehrer-/Eltern-Materialien. Die Leitplanken (keine Empfehlungen,
  // keine Brokerhinweise, keine Links) gelten app-weit (CLAUDE.md §2).
  for (const m of V2_MODULES) {
    if (m.explanations.young_adults) {
      v.push(...checkText(`modul:${m.id}.explanations.young_adults`, m.explanations.young_adults));
    }
    for (const [feld, txt] of Object.entries(m.pedagogy)) {
      if (txt) v.push(...checkText(`modul:${m.id}.pedagogy.${feld}`, txt));
    }
    for (const g of m.glossaryTerms) v.push(...checkText(`modul:${m.id}.glossar`, g));
    for (const [feld, txt] of Object.entries(m.teacherSupport ?? {})) {
      if (txt) v.push(...checkText(`modul:${m.id}.teacherSupport.${feld}`, txt));
    }
    for (const [feld, txt] of Object.entries(m.parentSupport ?? {})) {
      if (txt) v.push(...checkText(`modul:${m.id}.parentSupport.${feld}`, txt));
    }
  }
  return v;
}
