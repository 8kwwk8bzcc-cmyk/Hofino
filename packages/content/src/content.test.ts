import { describe, it, expect } from "vitest";
import { MODULES } from "./modules.js";
import { COMPANY_PROFILES, ETF_PROFILES } from "./profiles.js";
import {
  validateModuleSet,
  validateCompanyProfile,
  validateEtfProfile,
  validateQuestion,
} from "./schema.js";
import { getModule, modulesByBlock, MODULE_COUNT } from "./index.js";

describe("Lernmodule", () => {
  it("es sind genau 20 Module mit Reihenfolge 1..20", () => {
    expect(MODULE_COUNT).toBe(20);
    expect([...MODULES].map((m) => m.order).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1)
    );
  });

  it("alle Module sind schema-valide (3–5 Fragen, genau eine richtige Antwort, IDs eindeutig)", () => {
    expect(validateModuleSet(MODULES)).toEqual([]);
  });

  it("jede Frage hat 2–4 Optionen und einen gültigen correctIndex", () => {
    for (const m of MODULES) {
      for (const q of m.quiz) {
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options.length).toBeLessThanOrEqual(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(q.options.length);
      }
    }
  });

  it("die richtige Antwort steht nicht immer an erster Stelle", () => {
    const positions = new Set(MODULES.flatMap((m) => m.quiz.map((q) => q.correctIndex)));
    expect(positions.size).toBeGreaterThan(1);
  });

  it("Helfer: getModule und modulesByBlock", () => {
    expect(getModule("m05")?.title).toBe("Was ist eine Aktie?");
    expect(getModule("unbekannt")).toBeUndefined();
    expect(modulesByBlock("geld").map((m) => m.id)).toEqual(["m01", "m02", "m03", "m04"]);
  });
});

describe("Schema-Validatoren erkennen Fehler", () => {
  it("meldet falschen correctIndex", () => {
    const errs = validateQuestion({ question: "x", options: ["a", "b"], correctIndex: 5 }, "T");
    expect(errs.length).toBeGreaterThan(0);
  });
  it("meldet zu wenige Optionen", () => {
    const errs = validateQuestion({ question: "x", options: ["a"], correctIndex: 0 }, "T");
    expect(errs.length).toBeGreaterThan(0);
  });
});

describe("Profile", () => {
  it("alle Unternehmensprofile sind valide", () => {
    expect(COMPANY_PROFILES.flatMap(validateCompanyProfile)).toEqual([]);
  });
  it("alle ETF-Profile sind valide und als neutrale Lernbeispiele formuliert", () => {
    expect(ETF_PROFILES.flatMap(validateEtfProfile)).toEqual([]);
    // ETFs tragen ISIN/WKN als reale Produkte.
    for (const e of ETF_PROFILES) {
      expect(e.isin).toBeTruthy();
      expect(e.wkn).toBeTruthy();
    }
  });
});
