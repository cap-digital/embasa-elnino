import { CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { CountUp, currencyFormat, percentFormat } from "@/components/motion/count-up";
import { getCampaignSummary } from "@/data";
import { getLineDatasets } from "@/data/server";
import { formatCurrencyInt } from "@/lib/format";

/**
 * Números-chave da campanha na página inicial. É um Server Component async:
 * quando a fonte real de dados chegar, este bloco faz streaming dentro do
 * <Suspense> enquanto o restante da página já está na tela.
 */
export async function LandingStats() {
  const summary = getCampaignSummary(await getLineDatasets());
  const items = [
    {
      label: "Investido",
      value: summary.spent,
      format: currencyFormat,
      hint: `de ${formatCurrencyInt(summary.totalInvestment)} · ${Math.round(summary.investmentProgress * 100)}%`,
      icon: CheckCircle2,
      color: "var(--brand-yellow)",
    },
    {
      label: "Ritmo esperado",
      value: summary.expectedProgress,
      format: percentFormat,
      hint: `${summary.daysElapsed} de ${summary.daysTotal} dias`,
      icon: CheckCircle2,
      color: "var(--brand-cyan)",
    },
    {
      label: "Acima do ritmo",
      value: summary.counts.acima,
      hint: "linhas à frente",
      icon: TrendingUp,
      color: "var(--brand-lime)",
    },
    {
      label: "Abaixo do ritmo",
      value: summary.counts.abaixo,
      hint: "linhas em atenção",
      icon: TrendingDown,
      color: "var(--brand-orange)",
    },
  ] as const;

  const updated = summary.lastUpdated
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Bahia",
      }).format(new Date(summary.lastUpdated))
    : null;

  return (
    <div className="flex flex-col gap-2">
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm" key={item.label}>
          <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
            <item.icon aria-hidden className="size-3.5" style={{ color: item.color }} />
            {item.label}
          </dt>
          <dd className="mt-1 font-heading text-2xl font-extrabold tracking-tight" style={{ color: item.color }}>
            <CountUp format={"format" in item ? item.format : undefined} value={item.value} />
          </dd>
          <dd className="text-[11px] text-white/60">{item.hint}</dd>
        </div>
      ))}
    </dl>
      <p className="text-[11px] text-white/60">
        {updated ? `Dados das plataformas atualizados em ${updated}. ` : ""}
        {summary.withoutData > 0
          ? `${summary.withoutData} de ${summary.lines.length} plataformas ainda sem dados conectados.`
          : ""}
      </p>
    </div>
  );
}

export function LandingStatsSkeleton() {
  return (
    <div aria-busy className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="status">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="h-[92px] animate-pulse rounded-2xl border border-white/10 bg-white/5" key={i} />
      ))}
      <span className="sr-only">Carregando dados da campanha…</span>
    </div>
  );
}
