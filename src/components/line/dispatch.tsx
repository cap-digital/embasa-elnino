import { CalendarDays, Megaphone, Users } from "lucide-react";
import type { DisparosMetrics, SheetTable } from "@/data/types";
import { formatDateShort, formatInt, formatPercent } from "@/lib/format";

/**
 * WhatsApp: resultado do disparo em uma barra (entregues × não entregues sobre
 * as mensagens processadas, que ficam no KPI do topo).
 */
export function DispatchResult({ metrics, color }: { metrics: DisparosMetrics; color: string }) {
  const failed = Math.max(metrics.sent - metrics.delivered, 0);
  const deliveredShare = metrics.sent > 0 ? metrics.delivered / metrics.sent : 0;
  const parts = [
    { label: "Entregues com sucesso", value: metrics.delivered, share: deliveredShare, color },
    { label: "Não entregues", value: failed, share: 1 - deliveredShare, color: "var(--muted-foreground)" },
  ];

  return (
    <div className="flex h-full flex-col justify-center gap-4 py-2">
      <div className="flex h-4 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${formatPercent(deliveredShare, 1)} entregues`}>
        {parts.map((p) =>
          p.value > 0 ? (
            <div className="h-full first:rounded-l-full last:rounded-r-full" key={p.label} style={{ width: `${p.share * 100}%`, backgroundColor: p.color, opacity: p.label === "Não entregues" ? 0.35 : 1 }} />
          ) : null
        )}
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {parts.map((p) => (
          <li className="flex min-w-0 items-start gap-2" key={p.label}>
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color, opacity: p.label === "Não entregues" ? 0.35 : 1 }} />
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{p.label}</p>
              <p className="font-heading text-lg font-extrabold tabular-nums">
                {formatInt(p.value)} <span className="text-xs font-semibold text-muted-foreground">{formatPercent(p.share, 1)}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DETAIL_ICONS = { data: CalendarDays, target: Users, publico: Users, campanha: Megaphone } as Record<string, typeof Users>;

const normalize = (key: string) =>
  key.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Detalhes do disparo que só existem na planilha: data e as colunas de texto
 * (campanha, público…). Números ficam de fora — já estão nos KPIs e no resultado.
 */
export function DispatchDetails({ table }: { table: SheetTable }) {
  const labels: Record<string, string> = { data: "Data do disparo", target: "Público", publico: "Público", campanha: "Campanha" };
  const columns = table.columns
    .map((column, index) => ({ column, index, key: normalize(column) }))
    .filter(({ index, key }) => key === "data" || table.rows.some((row) => typeof row[index] === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(row[index] as string)));

  return (
    <ul className="flex flex-col divide-y divide-border">
      {table.rows.map((row, r) =>
        columns.map(({ column, index, key }) => {
          const Icon = DETAIL_ICONS[key] ?? Megaphone;
          const raw = row[index];
          const value = key === "data" && typeof raw === "string" ? formatDateShort(raw) : String(raw ?? "—");
          return (
            <li className="flex items-center gap-3 py-2.5" key={`${r}-${column}`}>
              <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-xs text-muted-foreground">{labels[key] ?? column}</span>
              <span className="text-sm font-semibold">{value}</span>
            </li>
          );
        })
      )}
    </ul>
  );
}
