import { describe, it, expect } from "vitest";
import {
  einstiegsStufe,
  initLeitner,
  instanziiereFrage,
  instanziiereVorlage,
  makeRng,
  naechsterLeitner,
  waehleDistraktoren,
} from "./engine.js";
import { fragenFuer, vorlagenFuer, SEED } from "./seed.js";
import type { Frage } from "./types.js";

const POOL = [
  { text: { de: "klar falsch" }, naehe: 1 as const },
  { text: { de: "mittel" }, naehe: 2 as const },
  { text: { de: "nah dran A" }, naehe: 3 as const },
  { text: { de: "nah dran B" }, naehe: 3 as const },
];

describe("waehleDistraktoren", () => {
  it("bevorzugt nahe Distraktoren bei hoher Stufe", () => {
    const rng = makeRng(1);
    const d = waehleDistraktoren(POOL, "meistern", 2, rng);
    expect(d.every((t) => t.startsWith("nah dran"))).toBe(true);
  });
  it("bevorzugt klar falsche bei niedriger Stufe", () => {
    const d = waehleDistraktoren(POOL, "erklaeren", 1, makeRng(1));
    expect(d[0]).toBe("klar falsch");
  });
});

describe("instanziiereFrage", () => {
  it("liefert genau eine korrekte Option und mischt", () => {
    const frage = fragenFuer("konzept_unternehmen", "verstehen")[0] as Frage;
    const inst = instanziiereFrage(frage, makeRng(7));
    expect(inst.optionen.filter((o) => o.korrekt)).toHaveLength(1);
    expect(inst.optionen).toHaveLength(1 + frage.anzahl_distraktoren_angezeigt);
    expect(inst.frage).toBe(frage.frage.de);
  });
});

describe("instanziiereVorlage – Kollisions-Validierung", () => {
  it("numerische Vorlage: immer volle, eindeutige Optionen mit genau einer korrekten", () => {
    const v = vorlagenFuer("konzept_geld_auf_konto", "anwenden")[0]!; // start + eingang - ausgabe
    for (let seed = 0; seed < 300; seed++) {
      const inst = instanziiereVorlage(v, makeRng(seed));
      const texte = inst.optionen.map((o) => o.text);
      expect(new Set(texte).size).toBe(texte.length); // keine doppelten Antworten
      expect(inst.optionen.filter((o) => o.korrekt)).toHaveLength(1);
      expect(inst.optionen).toHaveLength(1 + v.distraktor_formeln.length);
    }
  });
  it("kategoriale Vorlage (A/B/gleich): dedupliziert auf ≥2 eindeutige Optionen", () => {
    const v = vorlagenFuer("konzept_bezahlen_vergleichen", "anwenden")[0]!; // … ? 'A' : 'B'
    for (let seed = 0; seed < 100; seed++) {
      const inst = instanziiereVorlage(v, makeRng(seed));
      const texte = inst.optionen.map((o) => o.text);
      expect(new Set(texte).size).toBe(texte.length);
      expect(inst.optionen.filter((o) => o.korrekt)).toHaveLength(1);
      expect(inst.optionen.length).toBeGreaterThanOrEqual(2);
      expect(inst.optionen.length).toBeLessThanOrEqual(1 + v.distraktor_formeln.length);
    }
  });
  it("füllt Platzhalter in der Frage", () => {
    const v = vorlagenFuer("konzept_geld_auf_konto", "anwenden")[0]!;
    const inst = instanziiereVorlage(v, makeRng(3));
    expect(inst.frage).not.toContain("{");
  });
});

describe("alle Vorlagen erzeugen kollisionsfreie Instanzen", () => {
  for (const v of SEED.vorlagen) {
    it(`${v.id} (200×)`, () => {
      for (let s = 0; s < 200; s++) {
        const inst = instanziiereVorlage(v, makeRng(s * 7 + 1));
        const texte = inst.optionen.map((o) => o.text);
        expect(new Set(texte).size).toBe(texte.length);
        expect(inst.optionen.filter((o) => o.korrekt)).toHaveLength(1);
      }
    });
  }
});

describe("naechsterLeitner", () => {
  it("3× richtig in Folge → gemeistert; Box steigt; Fälligkeit nach Intervall", () => {
    let z = initLeitner("konzept_aktie", "2026-06-01");
    z = naechsterLeitner(z, true, "2026-06-01");
    expect(z.leitner_box).toBe(2);
    expect(z.naechste_faelligkeit).toBe("2026-06-04"); // +3 Tage (Box 2)
    z = naechsterLeitner(z, true, "2026-06-04");
    z = naechsterLeitner(z, true, "2026-06-11");
    expect(z.richtig_in_folge).toBe(3);
    expect(z.gemeistert).toBe(true);
  });
  it("falsch → zurück in Box 1, Serie 0, bleibt aber gemeistert (nie bestrafen)", () => {
    let z = initLeitner("k", "2026-06-01");
    z = { ...z, gemeistert: true, richtig_in_folge: 3, leitner_box: 4 };
    z = naechsterLeitner(z, false, "2026-06-01");
    expect(z.leitner_box).toBe(1);
    expect(z.richtig_in_folge).toBe(0);
    expect(z.gemeistert).toBe(true);
    expect(z.naechste_faelligkeit).toBe("2026-06-02"); // +1 Tag (Box 1)
  });
});

describe("einstiegsStufe", () => {
  it("ordnet Altersband korrekt zu", () => {
    expect(einstiegsStufe(9)).toBe("erklaeren");
    expect(einstiegsStufe(12)).toBe("erkennen");
    expect(einstiegsStufe(14)).toBe("verstehen");
  });
});
