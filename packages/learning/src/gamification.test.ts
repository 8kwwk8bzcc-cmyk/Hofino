import { describe, it, expect } from "vitest";
import { wissenslevel, xpSchwelle, rangFuer, bewerteAuszeichnungen } from "./gamification.js";

describe("wissenslevel", () => {
  it("Schwellen folgen 100*L*(L+1)/2", () => {
    expect(xpSchwelle(1)).toBe(100);
    expect(xpSchwelle(2)).toBe(300);
    expect(xpSchwelle(3)).toBe(600);
  });
  it("ordnet XP dem richtigen Level zu", () => {
    expect(wissenslevel(0).level).toBe(0);
    expect(wissenslevel(99).level).toBe(0);
    expect(wissenslevel(100).level).toBe(1);
    expect(wissenslevel(350).level).toBe(2);
  });
  it("liefert Fortschritt zum naechsten Level", () => {
    const l = wissenslevel(200); // Level 1 (100..300)
    expect(l.level).toBe(1);
    expect(l.xpImLevel).toBe(100);
    expect(l.xpFuerNaechstes).toBe(200);
    expect(l.fortschritt).toBeCloseTo(0.5);
  });
});

describe("Auszeichnungen", () => {
  it("rangFuer stuft korrekt ein", () => {
    const s = { bronze: 10, silber: 50, gold: 200 };
    expect(rangFuer(5, s)).toBe(null);
    expect(rangFuer(10, s)).toBe("bronze");
    expect(rangFuer(50, s)).toBe("silber");
    expect(rangFuer(200, s)).toBe("gold");
  });
  it("bewerteAuszeichnungen liefert Rang + naechste Schwelle", () => {
    const r = bewerteAuszeichnungen({ korrekteAntworten: 12, konzepteAbgeschlossen: 0, wissenslevel: 8 });
    const fleissig = r.find((x) => x.id === "fleissig")!;
    expect(fleissig.rang).toBe("bronze");
    expect(fleissig.naechsteSchwelle).toBe(50);
    const sammler = r.find((x) => x.id === "sammler")!;
    expect(sammler.rang).toBe(null);
    expect(sammler.naechsteSchwelle).toBe(1);
    const aufstieg = r.find((x) => x.id === "aufstieg")!;
    expect(aufstieg.rang).toBe("silber");
  });
});
