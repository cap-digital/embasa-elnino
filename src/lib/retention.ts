import type { EscutasMetrics, VisualizacoesMetrics } from "@/data/types";

/** Etapa de um funil de retenção (vídeo ou áudio). */
export interface RetentionStep {
  label: string;
  /** Fração 0–1 em relação à primeira etapa. */
  rate: number;
  /** Valor absoluto, quando existir (áudio). */
  count?: number;
}

/** Quartis do vídeo → etapas (taxas sobre as impressões). */
export function videoRetentionSteps(q: VisualizacoesMetrics["quartiles"]): RetentionStep[] {
  return [
    { label: "25%", rate: q.q25 },
    { label: "50%", rate: q.q50 },
    { label: "75%", rate: q.q75 },
    { label: "100%", rate: q.q100 },
  ];
}

/** Funil do áudio (Spotify) → etapas relativas aos inícios. */
export function audioRetentionSteps(f: EscutasMetrics["funnel"]): RetentionStep[] {
  const base = f.starts || 1;
  return [
    { label: "Inícios", rate: f.starts / base, count: f.starts },
    { label: "25%", rate: f.q25 / base, count: f.q25 },
    { label: "50%", rate: f.q50 / base, count: f.q50 },
    { label: "75%", rate: f.q75 / base, count: f.q75 },
    { label: "Completas", rate: f.completes / base, count: f.completes },
  ];
}
