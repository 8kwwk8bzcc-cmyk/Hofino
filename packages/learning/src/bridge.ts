// Bridge: stellt die gelieferten v2-Inhalte (LearningModule) über die bestehende Legacy-API
// (Konzept/Frage/Vorlage/Themenblock) bereit, damit App-Screens und die Quiz-Engine ohne
// Umbau weiterlaufen. v2 ist die Quelle der Wahrheit; die Legacy-Form ist nur eine Sicht.

import {
  LEVEL_TO_STUFE,
  type Frage,
  type InhaltsSeed,
  type Konzept,
  type Naehe,
  type Stufe,
  type Themenblock,
  type Vorlage,
  type LearningModule,
  type Question,
  type CalculationTemplate,
} from "./types.js";
import { V2_BLOCK_META, V2_MODULES } from "./content-v2.js";

export function questionToFrage(q: Question, konzeptId: string): Frage {
  return {
    id: q.id,
    konzept_id: konzeptId,
    stufe: LEVEL_TO_STUFE[q.level],
    typ: "multiple_choice",
    frage: { de: q.question },
    korrekte_antwort: { de: q.correctAnswer },
    distraktor_pool: q.distractors.map((d) => ({ text: { de: d.text }, naehe: d.closeness as Naehe })),
    anzahl_distraktoren_angezeigt: q.displayedDistractors ?? 3,
    erklaerung_nach_antwort: { de: q.explanationAfterAnswer },
    wissenspunkte: q.points,
  };
}

export function templateToVorlage(c: CalculationTemplate, konzeptId: string): Vorlage {
  const parameter: Vorlage["parameter"] = {};
  for (const [name, p] of Object.entries(c.parameters)) parameter[name] = { typ: "int", min: p.min, max: p.max };
  return {
    id: c.id,
    konzept_id: konzeptId,
    stufe: c.level === "master" ? "meistern" : "anwenden",
    parameter,
    frage_vorlage: { de: c.questionTemplate },
    loesung_formel: c.solutionFormula,
    distraktor_formeln: c.distractorFormulas,
    einheit: c.unit ?? "",
    rundung: "ganzzahl",
    erklaerung_nach_antwort: { de: c.explanationTemplate },
    wissenspunkte: c.points,
  };
}

export function moduleToKonzept(m: LearningModule, modulNr: number): Konzept {
  const stufen = [...new Set(m.questions.map((q) => LEVEL_TO_STUFE[q.level]))] as Stufe[];
  const lernerText = { de: m.explanations.learners_10_14 };
  const elternText = { de: m.explanations.parents_teachers };
  return {
    id: m.id,
    modul_nr: modulNr,
    themenblock_id: m.blockId,
    titel: { de: m.title },
    // Rechnerisch nur, wenn tatsächlich Vorlagen vorhanden sind (robust gegen
    // "calculation"-Module ohne Vorlage → fallen auf MC-Fragen zurück).
    ist_rechnerisch: (m.calculationTemplates?.length ?? 0) > 0,
    voraussetzungen: m.prerequisites,
    freischalt_level: m.unlockLevel,
    erklaerungen: { kind_8_10: lernerText, kind_11_14: lernerText, eltern_lehrer: elternText },
    stufen,
    explanationsV2: m.explanations,
  };
}

/** Baut den vollständigen Inhalts-Seed (Legacy-Form) aus den v2-Modulen. */
export function v2ToLegacySeed(): InhaltsSeed {
  const themenbloecke: Themenblock[] = V2_BLOCK_META.map((b) => ({ id: b.id, titel: { de: b.title } }));
  const konzepte: Konzept[] = V2_MODULES.map((m, i) => moduleToKonzept(m, i + 1));
  const fragen: Frage[] = V2_MODULES.flatMap((m) => m.questions.map((q) => questionToFrage(q, m.id)));
  const vorlagen: Vorlage[] = V2_MODULES.flatMap((m) =>
    (m.calculationTemplates ?? []).map((c) => templateToVorlage(c, m.id))
  );
  return { themenbloecke, konzepte, fragen, vorlagen };
}
