// Kinderschutz-Guard: prüft kindgerichtete Inhalte gegen harte Leitplanken (CLAUDE.md §2/§3).
// Im Kindermodus: keine externen Links, keine Brokerhinweise, keine Anlageempfehlungen, kein Chat.
// Geprüft werden die real angezeigten Inhalte: Lern-Inhalte (@hofino/learning SEED) + Profile.
import { SEED, type LangText } from "@hofino/learning";
import { COMPANY_PROFILES, ETF_PROFILES } from "./profiles.js";

export interface ForbiddenRule {
  pattern: RegExp;
  label: string;
}

export const FORBIDDEN_RULES: ForbiddenRule[] = [
  { pattern: /https?:\/\//i, label: "Externer Link (keine Brokerlinks im Kindermodus)" },
  { pattern: /\bbroker\b|depot er[öo]ffnen/i, label: "Brokerhinweis" },
  { pattern: /kaufempfehlung|anlageempfehlung/i, label: "Anlageempfehlung" },
  { pattern: /\bkauf(e|en) sie\b|\bwir empfehlen\b|\bdu solltest\b.{0,24}\b(kaufen|verkaufen)\b/i, label: "Empfehlende Aufforderung" },
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
  return v;
}
