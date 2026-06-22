// Kinderschutz-Guard: prüft kindgerichtete Inhalte gegen harte Leitplanken (CLAUDE.md §2/§3).
// Im Kindermodus: keine externen Links, keine Brokerhinweise, keine Anlageempfehlungen, kein Chat.
import { MODULES } from "./modules.js";
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

/** Prüft alle kindgerichteten Inhalte (Module + Profile) und liefert gefundene Verstöße. */
export function auditChildContent(): Violation[] {
  const v: Violation[] = [];
  for (const m of MODULES) {
    v.push(...checkText(`${m.id}.child`, m.child));
    v.push(...checkText(`${m.id}.example`, m.example));
    v.push(...checkText(`${m.id}.expert`, m.expert));
    v.push(...checkText(`${m.id}.title`, m.title));
    m.quiz.forEach((q, i) => {
      v.push(...checkText(`${m.id}.q${i}`, q.question));
      q.options.forEach((o) => v.push(...checkText(`${m.id}.q${i}.opt`, o)));
    });
  }
  for (const p of COMPANY_PROFILES) {
    for (const [k, val] of Object.entries(p)) v.push(...checkText(`company:${p.ticker}.${k}`, String(val)));
  }
  for (const p of ETF_PROFILES) {
    for (const [k, val] of Object.entries(p)) if (val) v.push(...checkText(`etf:${p.ticker}.${k}`, String(val)));
  }
  return v;
}
