// Lädt die ausgelieferten Curriculum-v2-Inhalte (10 Block-JSONs unter ./content/v2/).
// Die Dateien liegen bereits in der app-facing string-Form vor (LearningModule), daher
// werden sie direkt normalisiert (blockId aus dem Wrapper ergänzt). KEINE Inhalte erfunden.

import type { Audience, LearningModule } from "./types.js";

import b01 from "./content/v2/01_tb_geld_wert_entscheidungen.json";
import b02 from "./content/v2/02_tb_sparen_zinsen_inflation.json";
import b03 from "./content/v2/03_tb_unternehmen_verstehen.json";
import b04 from "./content/v2/04_tb_aktien_eigentum.json";
import b05 from "./content/v2/05_tb_boerse_verstehen.json";
import b06 from "./content/v2/06_tb_risiko_streuung_verhalten.json";
import b07 from "./content/v2/07_tb_etf_langfristig.json";
import b08 from "./content/v2/08_tb_depot_kosten_umsetzung.json";
import b09 from "./content/v2/09_tb_kennzahlen_bewertung.json";
import b10 from "./content/v2/10_tb_schutz_betrug_finanzverhalten.json";

export interface V2BlockMeta {
  id: string;
  title: string;
  unlockLevel: number;
  goal?: string;
  pedagogicalIdea?: string;
  moduleCount: number;
}

interface RawBlockFile {
  block: {
    id: string;
    title: string;
    unlockLevel: number;
    goal?: string;
    pedagogicalIdea?: string;
    modules: Record<string, unknown>[];
  };
}

const RAW_BLOCKS = [b01, b02, b03, b04, b05, b06, b07, b08, b09, b10] as unknown as RawBlockFile[];

/** Ein geliefertes Modul in die LearningModule-Form bringen (blockId aus dem Wrapper). */
function normalize(raw: Record<string, unknown>, blockId: string): LearningModule {
  return { ...(raw as unknown as LearningModule), blockId };
}

/** Blockreihenfolge + Metadaten (Titel, goal, pedagogicalIdea, Modulzahl). */
export const V2_BLOCK_META: V2BlockMeta[] = RAW_BLOCKS.map((f) => ({
  id: f.block.id,
  title: f.block.title,
  unlockLevel: f.block.unlockLevel,
  goal: f.block.goal,
  pedagogicalIdea: f.block.pedagogicalIdea,
  moduleCount: f.block.modules.length,
}));

/** Alle 104 v2-Module (app-facing, string), in Blockreihenfolge. */
export const V2_MODULES: LearningModule[] = RAW_BLOCKS.flatMap((f) =>
  f.block.modules.map((m) => normalize(m, f.block.id))
);

export function alleModuleV2(): LearningModule[] {
  return V2_MODULES;
}

export function modulV2ById(id: string): LearningModule | undefined {
  return V2_MODULES.find((m) => m.id === id);
}

export function moduleV2ByBlock(blockId: string): LearningModule[] {
  return V2_MODULES.filter((m) => m.blockId === blockId);
}

/** Zielgruppen-Erklärung eines v2-Moduls. */
export function explanationV2(module: LearningModule, audience: Audience): string {
  return module.explanations[audience] ?? module.explanations.learners_10_14 ?? "";
}
