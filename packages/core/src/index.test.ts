import { describe, it, expect } from "vitest";
import { CORE_READY } from "./index.js";

describe("core smoke", () => {
  it("paket ist einsatzbereit", () => {
    expect(CORE_READY).toBe(true);
  });
});
