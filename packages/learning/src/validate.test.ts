import { describe, it, expect } from "vitest";
import { alleModuleSource, alleModule, modulById } from "./seed.js";
import { validateModuleSourceSet, contentGaps } from "./validate.js";
import { fromLegacyKonzept, resolveModule, erklaerungFuer } from "./migrate.js";
import { alleKonzepte, fragenFuer, vorlagenFuer } from "./seed.js";
import { AUDIENCES } from "./types.js";

describe("v2-Migration: Legacy → LearningModule", () => {
  it("alle adaptierten Module sind strukturell valide", () => {
    expect(validateModuleSourceSet(alleModuleSource())).toEqual([]);
  });

  it("rechnerische Konzepte werden type=calculation, sonst understanding", () => {
    const calc = modulById("konzept_sparen"); // ist_rechnerisch: true
    const text = modulById("konzept_geld"); // ist_rechnerisch: false
    expect(calc?.type).toBe("calculation");
    expect(text?.type).toBe("understanding");
  });

  it("Vorlagen landen in calculationTemplates, Fragen in questions", () => {
    const spar = modulById("konzept_sparen");
    expect(spar?.questions.length).toBeGreaterThan(0);
    expect((spar?.calculationTemplates?.length ?? 0)).toBeGreaterThan(0);
    const tmpl = spar?.calculationTemplates?.[0];
    expect(tmpl?.solutionFormula).toBeTruthy();
    expect(Object.keys(tmpl?.parameters ?? {}).length).toBeGreaterThan(0);
  });

  it("Stufen werden auf englische QuestionLevel gemappt", () => {
    const geld = modulById("konzept_geld");
    const levels = new Set(geld?.questions.map((q) => q.level));
    expect(levels.has("explain")).toBe(true);
  });

  it("alle drei Zielgruppen sind als Erklärung vorhanden (Audience-Kollaps)", () => {
    const m = modulById("konzept_geld")!;
    for (const a of AUDIENCES) expect(typeof m.explanations[a]).toBe("string");
    // learners_10_14 zieht das alte kind_11_14-Band
    const k = alleKonzepte().find((x) => x.id === "konzept_geld")!;
    expect(m.explanations.learners_10_14).toBe(k.erklaerungen.kind_11_14.de);
    expect(erklaerungFuer(k, "parents_teachers")).toBe(k.erklaerungen.eltern_lehrer.de);
  });

  it("resolveModule projiziert LangText auf string", () => {
    const src = fromLegacyKonzept(
      alleKonzepte()[0]!,
      fragenFuer(alleKonzepte()[0]!.id),
      vorlagenFuer(alleKonzepte()[0]!.id)
    );
    const resolved = resolveModule(src);
    expect(typeof resolved.title).toBe("string");
    expect(resolved.questions.every((q) => typeof q.question === "string")).toBe(true);
  });

  it("contentGaps markiert die noch zu schreibenden v2-Felder", () => {
    const gaps = contentGaps(alleModuleSource());
    // Alle Legacy-Module haben offene Felder (pedagogy etc.) → Migrationsfortschritt sichtbar.
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0]!.missing).toContain("pedagogy.learningGoal");
  });

  it("alleModule liefert app-facing Module", () => {
    expect(alleModule().length).toBe(alleKonzepte().length);
  });
});
