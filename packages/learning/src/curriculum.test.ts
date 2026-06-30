import { describe, it, expect } from "vitest";
import {
  CURRICULUM_BLOCKS,
  LEGACY_MODULE_MAPPING,
  alleZielModule,
  blockFuerModul,
  targetsFor,
  legacySourcesFor,
  curriculumPlan,
  curriculumCoverage,
  checkCurriculumIntegrity,
} from "./curriculum.js";

describe("Curriculum v2 – Zielstruktur", () => {
  it("besteht aus 10 Blöcken mit aufsteigenden, nicht überlappenden Level-Ranges", () => {
    expect(CURRICULUM_BLOCKS).toHaveLength(10);
    for (let i = 1; i < CURRICULUM_BLOCKS.length; i++) {
      expect(CURRICULUM_BLOCKS[i]!.levelRange[0]).toBeGreaterThan(CURRICULUM_BLOCKS[i - 1]!.levelRange[1]);
    }
  });

  it("hat keine Integritätsprobleme (keine Duplikate, keine verbotenen IDs, alle Mapping-Ziele vorhanden)", () => {
    expect(checkCurriculumIntegrity()).toEqual([]);
  });

  it("verwendet konzept_kosten NICHT als Ziel-ID (ID-Konflikt), wohl aber als Legacy-Quelle", () => {
    expect(alleZielModule()).not.toContain("konzept_kosten");
    expect(targetsFor("konzept_kosten")).toEqual(["konzept_ordergebuehren"]);
    expect(blockFuerModul("konzept_ordergebuehren")?.id).toBe("tb_depot_kosten_umsetzung");
    expect(blockFuerModul("konzept_unternehmenskosten")?.id).toBe("tb_unternehmen_verstehen");
  });

  it("splittet konzept_verdienen in vier Unternehmens-Module", () => {
    expect(targetsFor("konzept_verdienen")).toEqual([
      "konzept_geschaeftsmodell",
      "konzept_umsatz",
      "konzept_unternehmenskosten",
      "konzept_gewinn",
    ]);
    expect(legacySourcesFor("konzept_unternehmenskosten")).toContain("konzept_verdienen");
  });

  it("benennt aktie_vs_etf und zocken gemäß Mapping um", () => {
    expect(targetsFor("konzept_aktie_vs_etf")).toEqual(["konzept_etf_vs_einzelaktie"]);
    expect(targetsFor("konzept_zocken")).toEqual(["konzept_investieren_vs_zocken"]);
    expect(blockFuerModul("konzept_investieren_vs_zocken")?.id).toBe("tb_schutz_betrug_finanzverhalten");
  });

  it("Coverage: migrate-Module entsprechen den Mapping-Zielen, Rest ist neu zu schreiben", () => {
    const cov = curriculumCoverage();
    expect(cov.totalModules).toBe(alleZielModule().length);
    expect(cov.migrate + cov.new).toBe(cov.totalModules);
    // Anzahl migrierbarer Ziele = distinkte Mapping-Werte.
    const distinctTargets = new Set(Object.keys(LEGACY_MODULE_MAPPING).flatMap(targetsFor));
    expect(cov.migrate).toBe(distinctTargets.size);
  });

  it("jeder Plan-Eintrag mit status=migrate hat ≥1 Legacy-Quelle", () => {
    for (const p of curriculumPlan()) {
      if (p.status === "migrate") expect(p.legacySources.length).toBeGreaterThan(0);
      else expect(p.legacySources).toEqual([]);
    }
  });
});
