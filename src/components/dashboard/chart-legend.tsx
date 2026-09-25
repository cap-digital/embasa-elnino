"use client";

import {
  Legend,
  LegendItem,
  LegendLabel,
  LegendMarker,
  LegendValue,
  type LegendItemData,
} from "@/components/charts/legend";
import { cn } from "@/lib/utils";

interface ChartLegendProps {
  items: LegendItemData[];
  hoveredIndex: number | null;
  onHoverChange: (index: number | null) => void;
  formatValue?: (value: number) => string;
  className?: string;
  columns?: 1 | 2;
}

/** Legenda que destaca a série correspondente no hover (Bklit Legend). */
export function ChartLegend({
  items,
  hoveredIndex,
  onHoverChange,
  formatValue,
  className,
  columns = 1,
}: ChartLegendProps) {
  return (
    <Legend
      className={cn(
        "gap-0.5",
        columns === 2 && "grid grid-cols-2 @2xl:grid-cols-1",
        className
      )}
      hoveredIndex={hoveredIndex}
      items={items}
      onHoverChange={onHoverChange}
    >
      <LegendItem className="flex items-center justify-between gap-3 px-2 py-1 text-xs data-hovered:bg-muted">
        <span className="flex min-w-0 items-center gap-2">
          <LegendMarker className="size-2.5 shrink-0 rounded-sm" />
          <LegendLabel className="truncate text-xs font-medium text-foreground" />
        </span>
        <LegendValue
          className="shrink-0 text-xs tabular-nums text-muted-foreground"
          formatValue={formatValue}
        />
      </LegendItem>
    </Legend>
  );
}
