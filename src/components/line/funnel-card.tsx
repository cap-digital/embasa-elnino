"use client";

import { FunnelChart, type FunnelStage } from "@/components/charts/funnel-chart";
import { formatCompact, formatPercent } from "@/lib/format";

/**
 * Funil de etapas (áudio, vídeo ou disparos).
 * Horizontal quando o card é largo; vertical em cards estreitos (mobile),
 * para os rótulos nunca saírem do card.
 */
export function StageFunnel({ stages, color }: { stages: FunnelStage[]; color: string }) {
  const common = {
    color,
    data: stages,
    edges: "curved" as const,
    formatPercentage: (pct: number) => formatPercent(pct / 100, 1),
    formatValue: formatCompact,
    labelLayout: "grouped" as const,
    layers: 3,
    showPercentage: true,
    showValues: true,
    style: { aspectRatio: "auto" },
  };
  return (
    <>
      <div className="hidden h-[260px] w-full @xl:block fit:h-full fit:min-h-0">
        <FunnelChart {...common} className="h-full" orientation="horizontal" />
      </div>
      <div className="w-full @xl:hidden" style={{ height: Math.max(stages.length * 92, 300) }}>
        <FunnelChart {...common} className="h-full" labelOrientation="horizontal" orientation="vertical" />
      </div>
    </>
  );
}
