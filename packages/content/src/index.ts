// @hofino/content – redaktionelle Inhalte: 20 Lernmodule + Unternehmens-/ETF-Profile.
export * from "./schema.js";
export * from "./modules.js";
export * from "./profiles.js";
export * from "./guard.js";

import { MODULES } from "./modules.js";
import type { LearningModule } from "./schema.js";

export const MODULE_COUNT = MODULES.length;

export function getModule(id: string): LearningModule | undefined {
  return MODULES.find((m) => m.id === id);
}

export function modulesByBlock(block: LearningModule["block"]): LearningModule[] {
  return MODULES.filter((m) => m.block === block);
}
