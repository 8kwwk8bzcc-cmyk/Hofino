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

// ─── Paket 2 (Code-Review 2026-07-10): Dezimal-Rundung, Kommaformat, Parametergrenzen ───

describe("Dezimal-Rundung & deutsche Formatierung (Vorlagen)", () => {
  const basis = {
    konzept_id: "k",
    stufe: "anwenden" as const,
    frage_vorlage: { de: "KGV bei Kurs {kurs} und Gewinn {gewinn} je Aktie?" },
    distraktor_formeln: ["kurs * gewinn", "kurs - gewinn", "kurs + gewinn"],
    einheit: "",
    wissenspunkte: 150,
  };

  it("dezimal1: KGV 10/4 wird als „2,5\" angezeigt (nicht „3\" oder „0\")", () => {
    const inst = instanziiereVorlage(
      {
        ...basis,
        id: "t_kgv",
        parameter: { kurs: { typ: "int", min: 10, max: 10 }, gewinn: { typ: "int", min: 4, max: 4 } },
        loesung_formel: "kurs / gewinn",
        rundung: "dezimal1",
      },
      makeRng(7)
    );
    expect(inst.optionen.find((o) => o.korrekt)?.text).toBe("2,5");
  });

  it("dezimal2 mit Einheit: Euro-Beträge mit zwei Nachkommastellen und Komma", () => {
    const inst = instanziiereVorlage(
      {
        ...basis,
        id: "t_euro",
        parameter: { betrag: { typ: "int", min: 1000, max: 1000 }, kosten: { typ: "int", min: 1, max: 1 } },
        loesung_formel: "betrag * kosten / 400",
        distraktor_formeln: ["betrag * kosten", "betrag / kosten", "kosten"],
        einheit: "Euro",
        rundung: "dezimal2",
      },
      makeRng(7)
    );
    expect(inst.optionen.find((o) => o.korrekt)?.text).toBe("2,50 Euro");
  });

  it("ganzzahl bleibt unverändert ganzzahlig", () => {
    const inst = instanziiereVorlage(
      {
        ...basis,
        id: "t_ganz",
        parameter: { a: { typ: "int", min: 7, max: 7 } },
        loesung_formel: "a * 2",
        distraktor_formeln: ["a", "a * 3", "a + 1"],
        rundung: "ganzzahl",
      },
      makeRng(7)
    );
    expect(inst.optionen.find((o) => o.korrekt)?.text).toBe("14");
  });
});

describe("Dezimal-Parameter bleiben innerhalb der Grenzen (randParam)", () => {
  it("min=0.1, max=2 erzeugt nie Werte über dem Maximum und zeigt Komma im Fragetext", () => {
    const vorlage = {
      id: "t_ter",
      konzept_id: "k",
      stufe: "anwenden" as const,
      parameter: { betrag: { typ: "int" as const, min: 1000, max: 1000 }, kosten: { typ: "int" as const, min: 0.1, max: 2 } },
      frage_vorlage: { de: "TER von {kosten} Prozent auf {betrag} Euro?" },
      loesung_formel: "betrag * kosten / 100",
      distraktor_formeln: ["betrag * kosten", "betrag * kosten / 10", "betrag * kosten / 1000"],
      einheit: "Euro",
      rundung: "dezimal2" as const,
      wissenspunkte: 150,
    };
    for (let seed = 1; seed <= 200; seed++) {
      const inst = instanziiereVorlage(vorlage, makeRng(seed));
      const m = inst.frage.match(/TER von ([\d,]+) Prozent/);
      expect(m).not.toBeNull();
      const wert = Number(m![1]!.replace(",", "."));
      expect(wert).toBeGreaterThanOrEqual(0.1);
      expect(wert).toBeLessThanOrEqual(2);
      // Dezimalwerte erscheinen mit Komma, nie mit Punkt
      expect(inst.frage).not.toMatch(/\d\.\d/);
    }
  });
});
