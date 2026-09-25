import type { Strategy, StrategyId } from "./types";

export const strategies: Record<StrategyId, Strategy> = {
  alcance: {
    id: "alcance",
    label: "Alcance",
    metricLabel: "impressões",
    unitCostLabel: "CPM",
    unitCostPer: 1000,
  },
  trafego: {
    id: "trafego",
    label: "Tráfego",
    metricLabel: "cliques",
    unitCostLabel: "CPC",
    unitCostPer: 1,
  },
  visualizacoes: {
    id: "visualizacoes",
    label: "Visualizações",
    metricLabel: "visualizações",
    unitCostLabel: "CPV",
    unitCostPer: 1,
  },
  escutas: {
    id: "escutas",
    label: "Escutas",
    metricLabel: "escutas completas",
    unitCostLabel: "CPE",
    unitCostPer: 1,
  },
  disparos: {
    id: "disparos",
    label: "Disparos",
    metricLabel: "disparos",
    unitCostLabel: null,
    unitCostPer: 1,
  },
};

export const strategyOrder: StrategyId[] = [
  "alcance",
  "trafego",
  "visualizacoes",
  "escutas",
  "disparos",
];
