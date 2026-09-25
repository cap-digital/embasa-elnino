import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatPercent, formatUnitCost } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Custo unitário realizado vs. contratado. Menor é melhor. */
export function UnitCostCompare({
  label,
  realized,
  contracted,
  size = "sm",
}: {
  label: string;
  realized: number;
  contracted: number;
  size?: "sm" | "lg";
}) {
  const delta = contracted > 0 ? realized / contracted - 1 : 0;
  const tone = delta <= -0.005 ? "good" : delta >= 0.005 ? "warn" : "neutral";
  const Icon = tone === "good" ? ArrowDownRight : tone === "warn" ? ArrowUpRight : Minus;
  return (
    <div className={cn("flex min-w-0 items-center gap-2", size === "lg" && "gap-3")}>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label} realizado
        </p>
        <p
          className={cn(
            "font-heading font-extrabold tabular-nums leading-tight",
            size === "lg" ? "text-2xl" : "text-sm"
          )}
        >
          {formatUnitCost(realized)}
          <span className="ml-1 font-sans text-xs font-medium text-muted-foreground">
            vs. {formatUnitCost(contracted)}
          </span>
        </p>
      </div>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
          tone === "good" && "bg-status-good text-status-good-foreground",
          tone === "warn" && "bg-status-warn text-status-warn-foreground",
          tone === "neutral" && "bg-status-neutral text-status-neutral-foreground"
        )}
        title={tone === "good" ? "Mais barato que o contratado" : tone === "warn" ? "Mais caro que o contratado" : "Igual ao contratado"}
      >
        <Icon aria-hidden className="size-3" />
        {delta > 0 ? "+" : ""}
        {formatPercent(delta, 1)}
      </span>
    </div>
  );
}
