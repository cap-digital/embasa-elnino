/**
 * Camada de dados compartilhada (segura para o client).
 * Os datasets reais vêm de `@/data/server` (somente servidor).
 */
export { campaign } from "./campaign";
export { marginFor, PLATFORM_MARGINS, platformSpendToInvestment } from "./margins";
export { isLineId, lineById, lineIds, lines } from "./lines";
export {
  campaignCalendar,
  clampInvestment,
  dailySpendByLine,
  type Datasets,
  getCampaignSummary,
  getLineSummary,
  investmentByStrategy,
  lineCumulative,
  investmentTimeline,
  linesWithData,
  type TimelineRow,
  type TimelineSegment,
  metricProgress,
  PACE_TOLERANCE,
  paceStatus,
} from "./metrics";
export { strategies, strategyOrder } from "./strategies";
export type * from "./types";
