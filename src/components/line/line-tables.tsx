import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LineSummary, SheetTable } from "@/data/types";
import {
  formatCurrency,
  formatCurrencyInt,
  formatDateShort,
  formatDayMonthBahia,
  formatDeltaPp,
  formatInt,
  formatPercent,
  formatProgress,
  formatUnitCost,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type Tone = "good" | "warn" | "neutral";
const toneClass: Record<Tone, string> = {
  good: "bg-status-good text-status-good-foreground",
  warn: "bg-status-warn text-status-warn-foreground",
  neutral: "bg-status-neutral text-status-neutral-foreground",
};

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", toneClass[tone])}>
      {children}
    </span>
  );
}

/** Contratado × realizado da linha, em linhas de tabela. */
export function ContractTable({ summary }: { summary: LineSummary }) {
  const { line, strategy } = summary;
  const unit = strategy.unitCostLabel;
  const costDelta =
    summary.realizedUnitCost !== null && line.contractedUnitCost
      ? summary.realizedUnitCost / line.contractedUnitCost - 1
      : null;

  const rows: Array<{ label: string; contracted: string; realized: string; status: React.ReactNode }> = [
    {
      label: `Meta (${strategy.metricLabel})`,
      contracted: formatInt(line.contractedMetric),
      realized: formatInt(summary.delivered),
      status: <Pill tone={summary.goalReached ? "good" : "neutral"}>{formatProgress(summary.metricProgress)}</Pill>,
    },
    {
      label: "Investimento",
      contracted: formatCurrencyInt(line.investment),
      realized: formatCurrencyInt(summary.spent),
      status: <Pill tone={summary.investmentComplete ? "good" : "neutral"}>{formatProgress(summary.investmentProgress)}</Pill>,
    },
    ...(unit && line.contractedUnitCost !== null
      ? [
          {
            label: `${unit} (custo unitário)`,
            contracted: formatUnitCost(line.contractedUnitCost),
            realized: summary.realizedUnitCost !== null ? formatUnitCost(summary.realizedUnitCost) : "—",
            status:
              costDelta === null ? (
                "—"
              ) : (
                <Pill tone={costDelta <= -0.005 ? "good" : costDelta >= 0.005 ? "warn" : "neutral"}>
                  {costDelta > 0 ? "+" : ""}
                  {formatPercent(costDelta, 1)}
                </Pill>
              ),
          },
        ]
      : []),
    {
      label: "Ritmo vs. esperado",
      contracted: formatProgress(summary.expectedProgress),
      realized: formatProgress(summary.metricProgress),
      status: (
        <Pill tone={summary.paceStatus === "acima" ? "good" : summary.paceStatus === "abaixo" ? "warn" : "neutral"}>
          {formatDeltaPp(summary.paceDelta)}
        </Pill>
      ),
    },
    ...(summary.flight
      ? [
          {
            label: "Veiculação",
            contracted: `${formatDayMonthBahia(summary.flight.start)} a ${formatDayMonthBahia(summary.flight.end)}`,
            realized: `${summary.daily.length} ${summary.daily.length === 1 ? "dia" : "dias"} com dados`,
            status: "—",
          },
        ]
      : []),
  ];

  return (
    <Table className="text-xs">
      <TableHeader>
        <TableRow>
          <TableHead className="h-8">Indicador</TableHead>
          <TableHead className="h-8 text-right">Contratado</TableHead>
          <TableHead className="h-8 text-right">Realizado</TableHead>
          <TableHead className="h-8 text-right">Situação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="py-2 font-medium">{row.label}</TableCell>
            <TableCell className="py-2 text-right tabular-nums text-muted-foreground">{row.contracted}</TableCell>
            <TableCell className="py-2 text-right font-heading font-extrabold tabular-nums">{row.realized}</TableCell>
            <TableCell className="py-2 text-right">{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Dia a dia da linha, do mais recente para o mais antigo. */
export function DailyTable({ summary }: { summary: LineSummary }) {
  const { line, strategy } = summary;
  const withCum: Array<(typeof summary.daily)[number] & { cumulative: number }> = [];
  for (const row of summary.daily) {
    const previous = withCum.at(-1)?.cumulative ?? 0;
    withCum.push({ ...row, cumulative: previous + row.delivered });
  }
  const rows = [...withCum].reverse();
  const unitLabel = strategy.unitCostLabel;
  const showImpressions = strategy.id !== "alcance";

  return (
    <Table className="text-xs">
      <TableHeader className="sticky top-0 z-10 bg-card">
        <TableRow>
          <TableHead className="h-8">Dia</TableHead>
          <TableHead className="h-8 text-right capitalize">{strategy.metricLabel}</TableHead>
          <TableHead className="h-8 text-right">Gasto</TableHead>
          {unitLabel ? <TableHead className="h-8 text-right">{unitLabel}</TableHead> : null}
          {showImpressions ? <TableHead className="h-8 text-right">Impressões</TableHead> : null}
          <TableHead className="h-8 text-right">Cliques</TableHead>
          <TableHead className="h-8 text-right">% da meta</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.date}>
            <TableCell className="py-1.5 font-medium">{formatDateShort(row.date)}</TableCell>
            <TableCell className="py-1.5 text-right font-semibold tabular-nums" style={{ color: line.color }}>
              {formatInt(row.delivered)}
            </TableCell>
            <TableCell className="py-1.5 text-right tabular-nums">{formatCurrency(row.spend)}</TableCell>
            {unitLabel ? (
              <TableCell className="py-1.5 text-right tabular-nums text-muted-foreground">
                {row.delivered > 0 ? formatUnitCost((row.spend / row.delivered) * strategy.unitCostPer) : "—"}
              </TableCell>
            ) : null}
            {showImpressions ? (
              <TableCell className="py-1.5 text-right tabular-nums text-muted-foreground">{formatInt(row.impressions)}</TableCell>
            ) : null}
            <TableCell className="py-1.5 text-right tabular-nums text-muted-foreground">{formatInt(row.clicks)}</TableCell>
            <TableCell className="py-1.5 text-right tabular-nums">{formatProgress(row.cumulative / line.contractedMetric)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Tabela da planilha como ela é: mesmas colunas e ordem das linhas. */
export function SheetDataTable({ table, color }: { table: SheetTable; color: string }) {
  const kind = table.columns.map((column) => {
    const key = column.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (key === "data" || key === "date" || key === "dia") {
      return "date" as const;
    }
    if (column.includes("%")) {
      return "percent" as const;
    }
    return "value" as const;
  });
  // Coluna % em pontos percentuais (34,71) em vez de fração (0,3471).
  const percentPoints = table.columns.map(
    (_, i) => kind[i] === "percent" && table.rows.some((row) => typeof row[i] === "number" && Math.abs(row[i] as number) > 1)
  );
  const format = (value: string | number | null, k: (typeof kind)[number], points: boolean) => {
    if (value === null || value === "") {
      return "—";
    }
    if (k === "date" && typeof value === "string") {
      return formatDateShort(value);
    }
    if (typeof value === "number") {
      return k === "percent" ? formatPercent(points ? value / 100 : value, 2) : formatInt(value);
    }
    return value;
  };

  return (
    <Table className="text-xs">
      <TableHeader className="sticky top-0 z-10 bg-card">
        <TableRow>
          {table.columns.map((column, i) => (
            <TableHead className={cn("h-8", i > 0 && kind[i] !== "date" && "text-right")} key={column}>
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {table.rows.map((row, r) => (
          <TableRow key={r}>
            {row.map((value, i) => {
              const numeric = typeof value === "number";
              return (
                <TableCell
                  className={cn(
                    "py-1.5",
                    i === 0 && "font-medium",
                    numeric && "text-right tabular-nums",
                    numeric && kind[i] === "percent" && "text-muted-foreground"
                  )}
                  key={table.columns[i]}
                  style={i > 0 && numeric && kind[i] !== "percent" && /impress/i.test(table.columns[i]) ? { color, fontWeight: 600 } : undefined}
                >
                  {format(value, kind[i], percentPoints[i])}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
