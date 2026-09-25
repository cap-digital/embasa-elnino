"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Hourglass } from "lucide-react";
import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Keyword } from "@/data/types";
import { formatCurrency, formatInt, formatPercent, formatUnitCost } from "@/lib/format";
import { cn } from "@/lib/utils";

const MATCH: Record<string, { label: string; className: string }> = {
  BROAD: { label: "Ampla", className: "bg-status-neutral text-status-neutral-foreground" },
  PHRASE: { label: "Frase", className: "bg-status-good text-status-good-foreground" },
  EXACT: { label: "Exata", className: "bg-brand-yellow/40 text-foreground" },
};

const STATUS: Record<string, string> = { ENABLED: "Ativa", PAUSED: "Pausada" };

type SortKey = "text" | "matchType" | "impressions" | "clicks" | "ctr" | "cpc" | "spend" | "qualityScore";

const ctrOf = (k: Keyword) => (k.impressions > 0 ? k.clicks / k.impressions : -1);
const cpcOf = (k: Keyword) => (k.clicks > 0 ? k.spend / k.clicks : -1);
const sortValue: Record<SortKey, (k: Keyword) => number | string> = {
  text: (k) => k.text.toLowerCase(),
  matchType: (k) => MATCH[k.matchType]?.label ?? k.matchType,
  impressions: (k) => k.impressions,
  clicks: (k) => k.clicks,
  ctr: ctrOf,
  cpc: cpcOf,
  spend: (k) => k.spend,
  qualityScore: (k) => k.qualityScore ?? -1,
};

function SortHeader({
  label,
  column,
  sort,
  onSort,
  align = "right",
}: {
  label: string;
  column: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" } | null;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort?.key === column;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("h-8", align === "right" && "text-right")}
    >
      <button
        className={cn(
          "inline-flex items-center gap-1 rounded px-1 -mx-1 transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
          align === "right" && "flex-row-reverse"
        )}
        onClick={() => onSort(column)}
        type="button"
      >
        {label}
        <Icon aria-hidden className={cn("size-3", !active && "opacity-50")} />
      </button>
    </TableHead>
  );
}

/** Palavras-chave da campanha de pesquisa, com métricas do período. */
export function KeywordTable({
  keywords: all,
  color,
  limit,
}: {
  keywords: Keyword[];
  color: string;
  /** Mostra só as N primeiras (já ordenadas por cliques e impressões). */
  limit?: number;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const onSort = (key: SortKey) =>
    setSort((current) =>
      current?.key === key
        ? { key, dir: current.dir === "desc" ? "asc" : "desc" }
        : { key, dir: key === "text" || key === "matchType" ? "asc" : "desc" }
    );
  // O top N é definido por cliques/impressões; a ordenação vale dentro dele.
  const keywords = useMemo(() => {
    const top = limit ? all.slice(0, limit) : all;
    if (!sort) {
      return top;
    }
    const get = sortValue[sort.key];
    return [...top].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const cmp = typeof va === "string" ? va.localeCompare(vb as string, "pt-BR") : va - (vb as number);
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [all, limit, sort]);
  const delivering = keywords.some((k) => k.impressions > 0);
  const groups = new Set(all.map((k) => k.adGroup)).size;
  const maxClicks = Math.max(...keywords.map((k) => k.clicks), 1);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
        <span>
          {limit && all.length > limit ? (
            <>
              Top <span className="font-semibold text-foreground">{keywords.length}</span> de{" "}
            </>
          ) : null}
          <span className="font-semibold text-foreground">{formatInt(all.length)}</span> palavras-chave em{" "}
          <span className="font-semibold text-foreground">{groups}</span> {groups === 1 ? "grupo" : "grupos"} de anúncios
        </span>
        {!delivering ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
            <Hourglass aria-hidden className="size-3" />
            Sem impressões ainda: o top 10 passa a seguir os cliques assim que houver entrega
          </span>
        ) : null}
      </div>
      <Table className="text-xs">
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <SortHeader align="left" column="text" label="Palavra-chave" onSort={onSort} sort={sort} />
            <SortHeader align="left" column="matchType" label="Correspondência" onSort={onSort} sort={sort} />
            <SortHeader column="impressions" label="Impressões" onSort={onSort} sort={sort} />
            <SortHeader column="clicks" label="Cliques" onSort={onSort} sort={sort} />
            <SortHeader column="ctr" label="CTR" onSort={onSort} sort={sort} />
            <SortHeader column="cpc" label="CPC" onSort={onSort} sort={sort} />
            <SortHeader column="spend" label="Investido" onSort={onSort} sort={sort} />
            <SortHeader column="qualityScore" label="Qualidade" onSort={onSort} sort={sort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {keywords.map((k) => {
            const match = MATCH[k.matchType] ?? { label: k.matchType, className: "bg-muted text-muted-foreground" };
            const has = k.impressions > 0;
            return (
              <TableRow key={`${k.adGroup}-${k.id}`}>
                <TableCell className="max-w-[280px] py-1.5">
                  <p className="truncate font-medium" title={k.text}>
                    {k.text}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {k.adGroup}
                    {k.status !== "ENABLED" ? ` · ${STATUS[k.status] ?? k.status}` : ""}
                  </p>
                  {k.clicks > 0 ? (
                    <div className="mt-1 h-1 w-full max-w-[160px] overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${(k.clicks / maxClicks) * 100}%`, backgroundColor: color }} />
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="py-1.5">
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", match.className)}>{match.label}</span>
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{has ? formatInt(k.impressions) : "—"}</TableCell>
                <TableCell className="py-1.5 text-right font-semibold tabular-nums" style={has ? { color } : undefined}>
                  {has ? formatInt(k.clicks) : "—"}
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums text-muted-foreground">
                  {has ? formatPercent(k.clicks / k.impressions, 2) : "—"}
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums text-muted-foreground">
                  {k.clicks > 0 ? formatUnitCost(k.spend / k.clicks) : "—"}
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{has ? formatCurrency(k.spend) : "—"}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums text-muted-foreground">
                  {k.qualityScore ? `${k.qualityScore}/10` : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
