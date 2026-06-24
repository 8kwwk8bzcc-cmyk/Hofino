import { describe, it, expect } from "vitest";
import { SEED } from "@hofino/learning";
import { auditChildContent, checkText } from "./guard.js";

describe("Kinderschutz-Guard", () => {
  it("der Audit prüft tatsächlich vorhandene Lern-Inhalte (kein Leerlauf)", () => {
    // Sonst wäre ein grünes [] wertlos, falls SEED versehentlich leer wäre.
    expect(SEED.konzepte.length).toBeGreaterThan(0);
    expect(SEED.fragen.length).toBeGreaterThan(0);
  });

  it("kindgerichtete Inhalte enthalten keine verbotenen Elemente", () => {
    expect(auditChildContent()).toEqual([]);
  });

  it("erkennt externe Links", () => {
    expect(checkText("x", "Mehr unter https://broker.example").length).toBeGreaterThan(0);
  });

  it("erkennt Anlageempfehlungen", () => {
    expect(checkText("x", "Das ist eine klare Kaufempfehlung.").length).toBeGreaterThan(0);
    expect(checkText("x", "Kaufen Sie jetzt diese Aktie.").length).toBeGreaterThan(0);
  });

  it("erkennt Brokerhinweise und Chat", () => {
    expect(checkText("x", "Eröffne ein Depot bei einem Broker.").length).toBeGreaterThan(0);
    expect(checkText("x", "Schreib mir per Chat.").length).toBeGreaterThan(0);
  });

  it("erlaubt legitime Lerninhalte (Kaufen/Verkaufen, kein echtes Geld)", () => {
    expect(checkText("x", "Was kostet Kaufen und Verkaufen?")).toEqual([]);
    expect(checkText("x", "Es fließt kein echtes Geld.")).toEqual([]);
    expect(checkText("x", "Investieren vs. Zocken")).toEqual([]);
  });
});
