import type { Metadata } from "next";
import {
  Eye,
  Headphones,
  MessageSquare,
  MousePointerClick,
  PlayCircle,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { KpiCard } from "@/components/campaign/kpi-card";
import { LineProgressRow } from "@/components/campaign/line-progress-row";
import { ProgressBar } from "@/components/campaign/progress-bar";
import { ChartCard } from "@/components/dashboard/chart-card";
import { InvestmentTimeline } from "@/components/dashboard/investment-timeline";
import { StrategyDistributionChart } from "@/components/dashboard/strategy-distribution-chart";
import { currencyFormat } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { campaign, getCampaignSummary, investmentByStrategy, investmentTimeline, lines } from "@/data";
import { getLineDatasets } from "@/data/server";
import { formatCurrencyInt, formatProgress } from "@/lib/format";

export const metadata: Metadata = { title: "Visão geral" };

// Renderiza a cada acesso lendo o cache de dados das APIs (1h, em
// src/data/server/sources.ts). Assim o botão "Atualizar dados" aparece na hora.
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const datasets = await getLineDatasets();
  const summary = getCampaignSummary(datasets);
  const timeline = investmentTimeline(datasets);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia" }).format(
    summary.lastUpdated ? new Date(summary.lastUpdated) : new Date()
  );
  const byStrategy = investmentByStrategy(datasets);
  const strategyHasData = (id: string) => summary.lines.some((l) => l.line.strategy === id && l.hasData);
  const strategyGroups = byStrategy.map((item) => ({
    ...item,
    platforms: summary.lines
      .filter((l) => l.line.strategy === item.strategy.id)
      .map((l) => ({
        id: l.line.id,
        name: l.line.shortName,
        color: l.line.color,
        contracted: l.line.investment,
        spent: l.spent,
        hasData: l.hasData,
      })),
  }));


  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3 p-3 sm:p-4 fit:grid fit:h-full fit:grid-rows-[auto_minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* KPIs consolidados */}
      <section aria-label="KPIs consolidados" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        <KpiCard
          accent="var(--brand-blue)"
          className="col-span-2 sm:col-span-3 xl:col-span-2"
          format={currencyFormat}
          icon={Wallet}
          label="Investido"
          value={summary.spent}
        >
          <ProgressBar
            className="mt-1"
            color="var(--brand-blue)"
            complete={summary.investmentComplete}
            label={`de ${formatCurrencyInt(summary.totalInvestment)} contratados`}
            progress={summary.investmentProgress}
            size="sm"
            variant="investment"
          />
        </KpiCard>
        <KpiCard accent="var(--strategy-alcance)" hint="todas as linhas" icon={Eye} label="Impressões" value={summary.totals.impressions} />
        <KpiCard accent="var(--strategy-visualizacoes)" hint="linhas de vídeo" icon={PlayCircle} label="Visualizações" empty={!strategyHasData("visualizacoes")} value={summary.totals.views} />
        <KpiCard accent="var(--strategy-trafego)" hint="todas as linhas" icon={MousePointerClick} label="Cliques" value={summary.totals.clicks} />
        <KpiCard accent="var(--strategy-escutas)" hint="Spotify" icon={Headphones} label="Escutas" empty={!strategyHasData("escutas")} value={summary.totals.listens} />
        <KpiCard accent="var(--strategy-disparos)" hint="WhatsApp · entregues" icon={MessageSquare} label="Disparos" empty={!strategyHasData("disparos")} value={summary.totals.sent} />
      </section>

      {/* Evolução + progresso por linha */}
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] fit:min-h-0">
        <ChartCard
          description="Períodos com investimento em cada plataforma. Passe o mouse numa barra para ver o detalhe."
          minHeight={320}
          scroll
          title="Evolução diária do investimento por linha"
        >
          <InvestmentTimeline end={campaign.endDate} rows={timeline} start={campaign.startDate} today={today} />
        </ChartCard>
        <ChartCard
          action={
            <span className="flex items-center gap-1 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-status-good px-1.5 py-0.5 text-status-good-foreground">
                <TrendingUp aria-hidden className="size-3" /> {summary.counts.acima}
              </span>
              <span className="inline-flex items-center rounded-full bg-status-neutral px-1.5 py-0.5 text-status-neutral-foreground">
                = {summary.counts["no-ritmo"]}
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-status-warn px-1.5 py-0.5 text-status-warn-foreground">
                <TrendingDown aria-hidden className="size-3" /> {summary.counts.abaixo}
              </span>
            </span>
          }
          description={`Métrica contratada e investimento por linha · ritmo esperado ${formatProgress(summary.expectedProgress)}.`}
          flush
          minHeight={420}
          scroll
          title={`Progresso das ${lines.length} linhas`}
        >
          <ul className="flex flex-col divide-y divide-border px-1 pb-1">
            {summary.lines.map((s) => (
              <li key={s.line.id}>
                <LineProgressRow summary={s} />
              </li>
            ))}
          </ul>
        </ChartCard>
      </section>

      {/* Custo unitário, estratégia e ritmo */}
      <section className="grid gap-3 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,2.3fr)_minmax(0,0.9fr)] fit:min-h-0">
        <ChartCard description="Cada fatia é o contratado da estratégia; a cor cheia é o que já foi investido." minHeight={260} title="Distribuição por estratégia">
          <StrategyDistributionChart groups={strategyGroups} />
        </ChartCard>
        <Reveal className="flex flex-col rounded-2xl border border-border bg-brand-navy p-4 text-white shadow-sm fit:min-h-0" y={12}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            Ritmo da campanha
          </p>
          <p className="mt-1 font-heading text-3xl font-black leading-none tracking-tight">
            {formatProgress(summary.expectedProgress)}
            <span className="ml-2 font-sans text-xs font-medium text-white/70">
              do período · {summary.daysElapsed} de {summary.daysTotal} dias
            </span>
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Acima", value: summary.counts.acima, color: "var(--brand-lime)" },
              { label: "No ritmo", value: summary.counts["no-ritmo"], color: "var(--brand-cyan)" },
              { label: "Abaixo", value: summary.counts.abaixo, color: "var(--brand-orange)" },
            ].map((item) => (
              <div className="rounded-xl bg-white/10 px-2 py-2" key={item.label}>
                <dd className="font-heading text-2xl font-black" style={{ color: item.color }}>
                  {item.value}
                </dd>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
                  {item.label}
                </dt>
              </div>
            ))}
          </dl>
          <div className="mt-auto pt-3 fit:min-h-0 fit:overflow-y-auto">
            <ul className="flex flex-wrap gap-1">
              {summary.lines
                .filter((l) => l.hasData && l.paceStatus === "abaixo")
                .map((l) => (
                  <li className="rounded-full bg-brand-orange/25 px-2 py-0.5 text-[11px] font-medium text-white" key={l.line.id}>
                    {l.line.shortName} · {formatProgress(l.metricProgress)}
                  </li>
                ))}
              {summary.lines
                .filter((l) => l.hasData && l.goalReached)
                .map((l) => (
                  <li className="rounded-full bg-brand-yellow px-2 py-0.5 text-[11px] font-semibold text-brand-navy-deep" key={l.line.id}>
                    {l.line.shortName} · meta batida · {formatProgress(l.metricProgress)}
                  </li>
                ))}
            </ul>
            {summary.withoutData > 0 ? (
              <p className="mt-2 text-[11px] text-white/70">
                {summary.withoutData} {summary.withoutData === 1 ? "linha ainda sem dados" : "linhas ainda sem dados"}: fora dos totais e do ritmo.
              </p>
            ) : null}
            <p className="mt-2 text-[11px] text-white/60">
              Investimento travado em {formatProgress(summary.investmentProgress)}: a barra nunca passa de 100%.
            </p>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
