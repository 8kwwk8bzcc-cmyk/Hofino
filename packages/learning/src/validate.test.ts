import { describe, it, expect } from "vitest";
import {
  alleModuleSource,
  alleModule,
  modulById,
  alleKonzepte,
  legacyAdaptedSources,
  legacyAdaptedModule,
  SEED_LEGACY,
} from "./seed.js";
import { validateModuleSourceSet, contentGaps, moduleReadiness, readinessReport } from "./validate.js";
import { fromLegacyKonzept, resolveModule, erklaerungFuer } from "./migrate.js";
import { AUDIENCES } from "./types.js";

describe("Legacy-Adapter (alte Inhalte → v2-Source)", () => {
  it("alle adaptierten Legacy-Module sind strukturell valide", () => {
    expect(validateModuleSourceSet(legacyAdaptedSources())).toEqual([]);
  });

  it("rechnerische Legacy-Konzepte werden type=calculation, sonst understanding", () => {
    expect(legacyAdaptedModule("konzept_sparen")?.type).toBe("calculation"); // ist_rechnerisch
    expect(legacyAdaptedModule("konzept_geld")?.type).toBe("understanding");
  });

  it("resolveModule projiziert LangText auf string", () => {
    const k = SEED_LEGACY.konzepte[0]!;
    const src = fromLegacyKonzept(
      k,
      SEED_LEGACY.fragen.filter((f) => f.konzept_id === k.id),
      SEED_LEGACY.vorlagen.filter((v) => v.konzept_id === k.id)
    );
    const resolved = resolveModule(src);
    expect(typeof resolved.title).toBe("string");
    expect(resolved.questions.every((q) => typeof q.question === "string")).toBe(true);
  });

  it("contentGaps markiert die fehlenden v2-Felder der Legacy-Inhalte", () => {
    const gaps = contentGaps(legacyAdaptedSources());
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0]!.missing).toContain("pedagogy.learningGoal");
  });

  it("Legacy-Module sind noch NICHT importreif (Readiness-Lücken)", () => {
    const report = readinessReport(legacyAdaptedSources());
    expect(report.length).toBeGreaterThan(0);
    expect(report[0]!.warnings.some((w) => w.startsWith("Lücke:"))).toBe(true);
  });
});

describe("Curriculum v2 (live) via Seed-Accessoren", () => {
  it("alleModuleSource ist strukturell valide und umfasst 104 Module", () => {
    const src = alleModuleSource();
    expect(src.length).toBe(104);
    expect(validateModuleSourceSet(src)).toEqual([]);
  });

  it("Modultypen kommen aus v2 (geld=understanding, bezahlen_vergleichen=calculation)", () => {
    expect(modulById("konzept_geld")?.type).toBe("understanding");
    expect(modulById("konzept_bezahlen_vergleichen")?.type).toBe("calculation");
  });

  it("alle drei Zielgruppen liefern echte v2-Texte (über erklaerungFuer)", () => {
    const m = modulById("konzept_geld")!;
    for (const a of AUDIENCES) expect(typeof m.explanations[a]).toBe("string");
    const k = alleKonzepte().find((x) => x.id === "konzept_geld")!;
    expect(erklaerungFuer(k, "young_adults")).toBe(m.explanations.young_adults);
    expect(erklaerungFuer(k, "parents_teachers")).toBe(m.explanations.parents_teachers);
  });

  it("alleModule liefert genau so viele app-facing Module wie Konzepte", () => {
    expect(alleModule().length).toBe(alleKonzepte().length);
    expect(alleModule().length).toBe(104);
  });

  it("understanding-Modul liefert keine Readiness-Lücken (vollständiger v2-Inhalt)", () => {
    const geld = alleModuleSource().find((m) => m.id === "konzept_geld")!;
    expect(moduleReadiness(geld)).toEqual([]);
  });
});
