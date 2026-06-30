import { describe, it, expect } from "vitest";
import { V2_MODULES, V2_BLOCK_META, alleModuleV2 } from "./content-v2.js";
import { liftModuleToSource } from "./migrate.js";
import { validateModuleSourceSet, readinessReport } from "./validate.js";
import { CURRICULUM_BLOCKS, alleZielModule, checkCurriculumIntegrity } from "./curriculum.js";
import { evalFormel } from "./formel.js";

const SPECIAL = /\?[^:]*:|'[^']*'|[<>]=?|===?|!=/; // Ternär/Vergleich/String → nicht numerisch

describe("Curriculum v2 – gelieferter Content", () => {
  it("enthält 104 Module in 10 Blöcken", () => {
    expect(V2_BLOCK_META).toHaveLength(10);
    expect(V2_MODULES).toHaveLength(104);
    expect(alleModuleV2()).toBe(V2_MODULES);
  });

  it("deckt die Curriculum-Zielstruktur exakt ab (IDs, Reihenfolge, keine Extras)", () => {
    expect(checkCurriculumIntegrity()).toEqual([]);
    const v2Ids = V2_MODULES.map((m) => m.id);
    expect(new Set(v2Ids).size).toBe(v2Ids.length);
    expect([...v2Ids].sort()).toEqual([...alleZielModule()].sort());
    // Reihenfolge je Block exakt wie Registry
    for (const b of CURRICULUM_BLOCKS) {
      const got = V2_MODULES.filter((m) => m.blockId === b.id).map((m) => m.id);
      expect(got).toEqual(b.modules);
    }
  });

  it("besteht die harte Strukturvalidierung", () => {
    expect(validateModuleSourceSet(V2_MODULES.map(liftModuleToSource))).toEqual([]);
  });

  // Bekannte redaktionelle Lücke im gelieferten Material (reviewStatus: editorial_review_recommended):
  // dieses Modul ist als "calculation" deklariert, liefert aber keine Rechenvorlage.
  const KNOWN_EDITORIAL_GAPS = new Set(["konzept_schwankung_vs_verlust"]);

  it("ist pädagogisch importreif – Readiness-Lücken nur in bekannter Allowlist (§19)", () => {
    const report = readinessReport(V2_MODULES.map(liftModuleToSource));
    if (report.length) console.log("Readiness-Warnungen:", JSON.stringify(report));
    const unerwartet = report.filter((r) => !KNOWN_EDITORIAL_GAPS.has(r.moduleId));
    expect(unerwartet).toEqual([]);
  });

  it("Rechenvorlagen sind auswertbar; Spezial-/Kollisionsfälle werden ausgewiesen", () => {
    const tmpls = V2_MODULES.flatMap((m) => m.calculationTemplates ?? []);
    expect(tmpls.length).toBe(45);
    const special: string[] = [];
    const cornerCollisions: string[] = [];
    let midCollisions = 0;
    for (const t of tmpls) {
      if (SPECIAL.test(t.solutionFormula)) {
        special.push(t.id); // Ternär/String → Engine-Erweiterung in Phase 2
        continue;
      }
      for (const corner of ["min", "mid", "max"] as const) {
        const vars: Record<string, number> = {};
        for (const [k, p] of Object.entries(t.parameters)) {
          vars[k] = corner === "min" ? p.min : corner === "max" ? p.max : Math.round((p.min + p.max) / 2);
        }
        // Darf nicht werfen (Engine muss rechnen können).
        const sol = Math.round(evalFormel(t.solutionFormula, vars));
        const ds = t.distractorFormulas.map((f) => Math.round(evalFormel(f, vars)));
        const all = [sol, ...ds];
        if (new Set(all).size !== all.length) {
          cornerCollisions.push(`${t.id}@${corner}`);
          if (corner === "mid") midCollisions++;
        }
      }
    }
    console.log(`Spezial-Vorlagen: ${special.join(", ") || "(keine)"}`);
    console.log(`Eckfall-Kollisionen (Engine würfelt neu, tolerierbar): ${cornerCollisions.length}`);
    // Genau die eine bekannte Spezial-Vorlage (Ternär/String).
    expect(special).toEqual(["tmpl_bez_grundpreis"]);
    // Mittelpunkt-Kollisionen sind die kritischeren – als Obergrenze tracken.
    expect(midCollisions).toBeLessThanOrEqual(2);
  });
});
