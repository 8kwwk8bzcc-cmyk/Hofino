import { describe, it, expect } from "vitest";
import { houseStage, HOUSE_STAGES, type HouseProgress } from "./house.js";

const empty: HouseProgress = {
  hasInvested: false,
  modulesCompleted: 0,
  riskAndDiversificationUnderstood: false,
  themenbloeckeCompleted: 0,
  milestonesReached: 0,
};

describe("house", () => {
  it("startet auf dem Grundstück", () => {
    expect(houseStage(empty)).toBe("grundstueck");
  });

  it("durchläuft die Stufen in der richtigen Reihenfolge", () => {
    expect(houseStage({ ...empty, hasInvested: true })).toBe("fundament");
    expect(houseStage({ ...empty, hasInvested: true, modulesCompleted: 1 })).toBe("waende");
    expect(
      houseStage({
        ...empty,
        hasInvested: true,
        modulesCompleted: 3,
        riskAndDiversificationUnderstood: true,
      })
    ).toBe("dach");
    expect(
      houseStage({
        ...empty,
        hasInvested: true,
        modulesCompleted: 3,
        riskAndDiversificationUnderstood: true,
        themenbloeckeCompleted: 1,
      })
    ).toBe("erstes_haus");
    expect(
      houseStage({
        hasInvested: true,
        modulesCompleted: 5,
        riskAndDiversificationUnderstood: true,
        themenbloeckeCompleted: 1,
        milestonesReached: 2,
      })
    ).toBe("ausbauten");
  });

  it("HOUSE_STAGES enthält genau sechs geordnete Stufen", () => {
    expect(HOUSE_STAGES).toEqual([
      "grundstueck",
      "fundament",
      "waende",
      "dach",
      "erstes_haus",
      "ausbauten",
    ]);
  });

  it("kein Einsturz: ohne Investment bleibt es Grundstück, auch mit viel Lernfortschritt", () => {
    // Tore sind sequenziell – ohne erstes Investment kein Aufstieg.
    expect(
      houseStage({
        ...empty,
        modulesCompleted: 10,
        riskAndDiversificationUnderstood: true,
        themenbloeckeCompleted: 3,
      })
    ).toBe("grundstueck");
  });
});
