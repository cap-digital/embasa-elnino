import type { PaceStatus, StrategyId } from "@/data/types";

export const paceMeta: Record<
  PaceStatus,
  { label: string; short: string; tone: "good" | "neutral" | "warn" }
> = {
  acima: { label: "Acima do ritmo", short: "Acima", tone: "good" },
  "no-ritmo": { label: "No ritmo", short: "No ritmo", tone: "neutral" },
  abaixo: { label: "Abaixo do ritmo", short: "Abaixo", tone: "warn" },
};

export const toneClass: Record<"good" | "neutral" | "warn", string> = {
  good: "bg-status-good text-status-good-foreground",
  neutral: "bg-status-neutral text-status-neutral-foreground",
  warn: "bg-status-warn text-status-warn-foreground",
};

/** Cor fixa por estratégia (tokens da marca), usada na distribuição do investimento. */
export const strategyColor: Record<StrategyId, string> = {
  alcance: "var(--strategy-alcance)",
  trafego: "var(--strategy-trafego)",
  visualizacoes: "var(--strategy-visualizacoes)",
  escutas: "var(--strategy-escutas)",
  disparos: "var(--strategy-disparos)",
};
