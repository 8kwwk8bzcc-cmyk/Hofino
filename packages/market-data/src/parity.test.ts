import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Stellt sicher, dass die kanonische Datei und ihre Deno-Kopie für die Edge-Function
// byte-identisch bleiben (gemeinsame Kurslogik, kein Auseinanderdriften).
describe("price-model parity", () => {
  it("Node-Quelle == Deno-Kopie (_shared)", () => {
    const here = fileURLToPath(new URL(".", import.meta.url));
    const canonical = readFileSync(`${here}price-model.ts`, "utf8");
    const copy = readFileSync(
      `${here}../../../supabase/functions/_shared/price-model.ts`,
      "utf8"
    );
    expect(copy).toBe(canonical);
  });
});
