import { describe, it, expect } from "vitest";
import { V2_MODULES, V2_BLOCK_META, alleModuleV2 } from "./content-v2.js";
import { liftModuleToSource } from "./migrate.js";
import { validateModuleSourceSet, readinessReport } from "./validate.js";
import { CURRICULUM_BLOCKS, alleZielModule, checkCurriculumIntegrity } from "./curriculum.js";
import { evalFormel, evalFormelValue } from "./formel.js";

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

  it("ist pädagogisch importreif – keine Readiness-Lücken (§19)", () => {
    const report = readinessReport(V2_MODULES.map(liftModuleToSource));
    if (report.length) console.log("Readiness-Warnungen:", JSON.stringify(report));
    expect(report).toEqual([]);
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

  // Paket 2 (Review-Fund): Bei exakt gleichem Stückpreis muss die Lösung „gleich" sein —
  // vorher lieferte die Formel 'B' und die richtige Kinder-Antwort wurde als falsch gewertet.
  it("tmpl_bez_grundpreis: Gleichstand liefert 'gleich', sonst korrekt A/B", () => {
    const t = V2_MODULES.flatMap((m) => m.calculationTemplates ?? []).find(
      (x) => x.id === "tmpl_bez_grundpreis"
    )!;
    expect(t).toBeDefined();
    // Gleicher Stückpreis (1 €): → gleich
    expect(evalFormelValue(t.solutionFormula, { mengeA: 2, preisA: 2, mengeB: 4, preisB: 4 })).toBe("gleich");
    expect(evalFormelValue(t.solutionFormula, { mengeA: 3, preisA: 6, mengeB: 5, preisB: 10 })).toBe("gleich");
    // A günstiger (1 € vs. 1,25 €): → A
    expect(evalFormelValue(t.solutionFormula, { mengeA: 2, preisA: 2, mengeB: 4, preisB: 5 })).toBe("A");
    // B günstiger (0,67 € vs. 0,5 €): → B
    expect(evalFormelValue(t.solutionFormula, { mengeA: 3, preisA: 2, mengeB: 4, preisB: 2 })).toBe("B");
    // Vollständiger Scan: die Lösung stimmt für JEDE Kombination mit dem wahren Grundpreisvergleich überein
    let checked = 0;
    for (let mengeA = 2; mengeA <= 10; mengeA++) for (let preisA = 2; preisA <= 20; preisA += 3)
      for (let mengeB = 2; mengeB <= 10; mengeB++) for (let preisB = 2; preisB <= 20; preisB += 3) {
        const wahr = preisA * mengeB === preisB * mengeA ? "gleich" : preisA * mengeB < preisB * mengeA ? "A" : "B";
        expect(evalFormelValue(t.solutionFormula, { mengeA, preisA, mengeB, preisB })).toBe(wahr);
        checked++;
      }
    expect(checked).toBeGreaterThan(2000);
  });
});
