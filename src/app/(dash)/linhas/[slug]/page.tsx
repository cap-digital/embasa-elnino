import type { Metadata } from "next";
import {
  CalendarRange,
  Coins,
  Gauge,
  KeyRound,
  MousePointerClick,
  Percent,
  Radio,
  Send,
  Target,
  Wallet,
} from "lucide-react";
import { notFound } from "next/navigation";
import { KpiCard } from "@/components/campaign/kpi-card";
import { NoDataNotice } from "@/components/campaign/no-data-notice";
import { ProgressBar } from "@/components/campaign/progress-bar";
import { UnitCostCompare } from "@/components/campaign/unit-cost-compare";
import { ChartCard } from "@/components/dashboard/chart-card";
import { ComplementaryMetrics } from "@/components/line/complementary-metrics";
import {
  DailyClicksChart,
  DailyDeliveryChart,
  DailySpendChart,
  PaceChart,
  PaceRings,
  RetentionChart,
} from "@/components/line/line-charts";
import { CreativeGallery, VideoList } from "@/components/line/creatives";
import { DeliveryHeatmap } from "@/components/line/delivery-heatmap";
import { KeywordTable } from "@/components/line/keyword-table";
import { StageFunnel } from "@/components/line/funnel-card";
import { DispatchDetails, DispatchResult } from "@/components/line/dispatch";
import { ContractTable, DailyTable, SheetDataTable } from "@/components/line/line-tables";
import { LineTitleBar } from "@/components/line/line-title-bar";
import { VideoRates } from "@/components/line/video-rates";
import { currencyCentsFormat, currencyFormat } from "@/components/motion/count-up";
import { ClicksGauge, KeywordThemesChart, SearchDailyCombo } from "@/components/line/search-widgets";
import { Reveal } from "@/components/motion/reveal";
import { getLineSummary, isLineId, lineById, lineCumulative, lines } from "@/data";
import { getLineDatasets } from "@/data/server";
import type { LineSummary } from "@/data/types";
import {
  formatCurrencyInt,
  formatDayMonthBahia,
  formatDeltaPp,
  formatInt,
  formatPercent,
  formatProgress,
  formatUnitCost,
} from "@/lib/format";
import { keywordThemes } from "@/lib/keyword-themes";
import { funnelStagesFor, LINE_LAYOUT } from "@/lib/line-layouts";
import { audioRetentionSteps, videoRetentionSteps } from "@/lib/retention";

// Renderiza a cada acesso lendo o cache de dados das APIs (1h, em
// src/data/server/sources.ts). Assim o botão "Atualizar dados" aparece na hora.
export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/linhas/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  if (!isLineId(slug)) {
    return { title: "Plataforma não encontrada" };
  }
  return { title: lineById[slug].name };
}

export default async function LinePage(props: PageProps<"/linhas/[slug]">) {
  const { slug } = await props.params;
  if (!isLineId(slug)) {
    notFound();
  }
  const datasets = await getLineDatasets();
  const summary = getLineSummary(slug, datasets);
  const index = lines.findIndex((l) => l.id === slug);
  const prev = index > 0 ? lines[index - 1] : null;
  const next = index < lines.length - 1 ? lines[index + 1] : null;

  // Pesquisa: página própria assim que a campanha existe (antes e depois da entrega).
  if (slug === "rede-pesquisa" && summary.keywords.length > 0) {
    return <SearchLinePage next={next} prev={prev} summary={summary} />;
  }

  if (!summary.hasData) {
    return <NoDataLinePage next={next} prev={prev} summary={summary} />;
  }

  const cumulative = lineCumulative(slug, datasets);
  const { line, strategy } = summary;
  const hasCost =
    strategy.unitCostLabel && summary.realizedUnitCost !== null && line.contractedUnitCost !== null;
  // WhatsApp: disparo único — sem ritmo diário; o 4º KPI vira mensagens processadas.
  const dispatch = summary.complementary?.strategy === "disparos" ? summary.complementary : null;
  const dispatchDays = summary.daily.filter((r) => r.delivered > 0 || r.impressions > 0).length;
  const expectedHint = summary.flight
    ? `esperado ${formatProgress(summary.expectedProgress)} · veiculação de ${formatDayMonthBahia(summary.flight.start)} a ${formatDayMonthBahia(summary.flight.end)}`
    : `esperado ${formatProgress(summary.expectedProgress)} · ${formatDeltaPp(summary.paceDelta)}`;

  return (
    <div
      className={`mx-auto flex w-full max-w-[1800px] flex-col gap-3 p-3 sm:p-4 fit:grid fit:h-full ${
        dispatch && dispatchDays < 2
          ? "fit:content-start fit:grid-rows-[auto_auto_auto]"
          : "fit:grid-rows-[auto_auto_minmax(0,1fr)_minmax(0,1fr)]"
      }`}
    >
      <LineTitleBar next={next} prev={prev} summary={summary} />

      {/* KPIs da linha */}
      <section aria-label="Indicadores da linha" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          accent={line.color}
          className="col-span-2"
          colored
          hint={`de ${formatInt(line.contractedMetric)} contratados · ${formatProgress(summary.metricProgress)} da meta`}
          icon={Target}
          label={`${strategy.metricLabel} entregues`}
          value={summary.delivered}
        >
          <ProgressBar
            className="mt-1"
            color={line.color}
            expected={summary.expectedProgress}
            label="Métrica contratada"
            progress={summary.metricProgress}
            size="sm"
            variant="metric"
          />
        </KpiCard>
        <KpiCard
          accent="var(--brand-navy)"
          className="col-span-2 sm:col-span-1 xl:col-span-2"
          format={currencyFormat}
          icon={Wallet}
          label="Investido"
          value={summary.spent}
        >
          <ProgressBar
            className="mt-1"
            color="var(--brand-navy)"
            complete={summary.investmentComplete}
            label={`de ${formatCurrencyInt(line.investment)} · saldo ${formatCurrencyInt(Math.max(line.investment - summary.spent, 0))}`}
            progress={summary.investmentProgress}
            size="sm"
            variant="investment"
          />
        </KpiCard>
        <Reveal className="flex min-w-0 flex-col justify-center rounded-2xl border border-border bg-card px-4 py-3 shadow-sm" y={12}>
          {hasCost ? (
            <UnitCostCompare
              contracted={line.contractedUnitCost!}
              label={strategy.unitCostLabel!}
              realized={summary.realizedUnitCost!}
            />
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Custo por disparo</p>
              <p className="font-heading text-2xl font-extrabold tracking-tight">
                {formatUnitCost(summary.spentRaw / Math.max(summary.delivered, 1))}
              </p>
              <p className="text-[11px] text-muted-foreground">sem custo unitário contratado</p>
            </>
          )}
        </Reveal>
        {dispatch ? (
          <KpiCard
            accent="var(--brand-cyan)"
            hint={`mensagens pela API · ${formatPercent(dispatch.deliveryRate, 1)} entregues`}
            icon={Send}
            label="Processadas"
            value={dispatch.sent}
          />
        ) : (
          <KpiCard
            accent="var(--brand-cyan)"
            format={{ style: "percent", maximumFractionDigits: 0 }}
            hint={expectedHint}
            icon={Gauge}
            label="Ritmo"
            value={summary.metricProgress}
          />
        )}
      </section>

      <LineBody cumulative={cumulative} summary={summary} />
    </div>
  );
}

type Cumulative = ReturnType<typeof lineCumulative>;

/** Corpo da página: composição varia por plataforma (ver LINE_LAYOUT). */
function LineBody({ summary, cumulative }: { summary: LineSummary; cumulative: Cumulative }) {
  const { line, strategy } = summary;
  const complementary = summary.complementary!;
  const color = line.color;
  // Rich Media: investimento diário fixo na planilha — cliques no lugar do gasto
  // diário, tabela da planilha no lugar do progresso e sem métricas complementares.
  const isRichMedia = line.id === "rich-media";
  const rowA = "grid gap-3 fit:min-h-0";
  const rowB = "grid gap-3 fit:min-h-0";

  const pace = (
    <ChartCard
      description={`${strategy.metricLabel} acumuladas vs. meta esperada para a data (tracejada).`}
      minHeight={280}
      title="Ritmo em relação à meta"
    >
      <PaceChart color={color} data={cumulative} metricLabel={strategy.metricLabel} />
    </ChartCard>
  );
  const delivery = (
    <ChartCard description={`${strategy.metricLabel} entregues por dia.`} minHeight={280} title="Evolução diária da entrega">
      <DailyDeliveryChart color={color} data={cumulative} metricLabel={strategy.metricLabel} />
    </ChartCard>
  );
  const spend = isRichMedia ? (
    <ChartCard description="Cliques por dia; no tooltip, o acumulado e o CTR do dia." minHeight={280} title="Evolução diária dos cliques">
      <DailyClicksChart color={color} data={cumulative} />
    </ChartCard>
  ) : (
    <ChartCard description="Gasto por dia; no tooltip, o acumulado travado no contratado." minHeight={280} title="Evolução diária do investimento">
      <DailySpendChart color={color} data={cumulative} />
    </ChartCard>
  );
  const complementaryCard = (
    <ChartCard description={`Métricas complementares da estratégia ${strategy.label}.`} minHeight={200} scroll title="Métricas complementares">
      <ComplementaryMetrics
        clicksInsteadOfMetric={line.id === "video-hawk" || line.id === "connected-tv"}
        color={color}
        metrics={complementary}
      />
    </ChartCard>
  );
  const rings =
    isRichMedia && summary.sheetTable ? (
      <ChartCard
        description="Dados da planilha por banner e dia."
        flush
        minHeight={260}
        scroll
        title="Detalhamento por banner"
      >
        <div className="px-3 pb-2">
          <SheetDataTable color={color} table={summary.sheetTable} />
        </div>
      </ChartCard>
    ) : (
      <ChartCard
        description={`% da meta de ${strategy.metricLabel}: entregue vs. esperado até hoje; e investimento (travado).`}
        minHeight={260}
        title="Progresso"
      >
        <PaceRings
          color={color}
          expectedProgress={summary.expectedProgress}
          investmentProgress={summary.investmentProgress}
          metricLabel={strategy.metricLabel}
          metricProgress={summary.metricProgress}
        />
      </ChartCard>
    );
  const retention =
    complementary.strategy === "visualizacoes" && complementary.quartiles.q25 > 0 ? (
      <ChartCard description="Impressões que chegaram a cada quartil do vídeo." minHeight={240} title="Retenção por quartil">
        <RetentionChart color={color} steps={videoRetentionSteps(complementary.quartiles)} />
      </ChartCard>
    ) : complementary.strategy === "escutas" && complementary.funnel.starts > 0 ? (
      <ChartCard description="Do início do áudio à escuta completa (período inteiro)." minHeight={240} title="Retenção do áudio">
        <RetentionChart color={color} steps={audioRetentionSteps(complementary.funnel)} />
      </ChartCard>
    ) : (
      rings
    );
  const dailyTable = (
    <ChartCard description="Dia a dia, do mais recente ao mais antigo." flush minHeight={240} scroll title="Detalhamento diário">
      <div className="px-3 pb-2">
        <DailyTable summary={summary} />
      </div>
    </ChartCard>
  );

  const layout = LINE_LAYOUT[line.id];
  const funnel = funnelStagesFor(summary);
  const videos = (
    <ChartCard description="Vídeos com entrega no período. Clique para assistir." minHeight={260} scroll title="Vídeos da campanha">
      <VideoList color={color} creatives={summary.creatives} />
    </ChartCard>
  );

  // WhatsApp: resultado do disparo + detalhes da planilha. Ritmo e tabela diária
  // só com mais de um dia de disparo (com um dia, repetiriam os KPIs).
  if (complementary.strategy === "disparos") {
    const days = summary.daily.filter((r) => r.delivered > 0 || r.impressions > 0).length;
    return (
      <>
        <section className={`${rowA} lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]`}>
          <ChartCard description="Mensagens processadas pela API: entregues com sucesso e não entregues." minHeight={110} title="Resultado do disparo">
            <DispatchResult color={color} metrics={complementary} />
          </ChartCard>
          {summary.sheetTable ? (
            <ChartCard description="Informações do disparo na planilha." minHeight={110} title="Detalhes">
              <DispatchDetails table={summary.sheetTable} />
            </ChartCard>
          ) : null}
        </section>
        {days >= 2 ? (
          <section className={`${rowB} lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]`}>
            {pace}
            {dailyTable}
          </section>
        ) : null}
      </>
    );
  }

  // Display: detalhamento diário + ritmo; criativos estáticos + complementares.
  if (layout === "display") {
    return (
      <>
        <section className={`${rowA} lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]`}>
          {dailyTable}
          {pace}
        </section>
        <section className={`${rowB} lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]`}>
          <ChartCard
            description="Banners com entrega no período, com as métricas de cada criativo."
            minHeight={260}
            scroll
            title="Criativos"
          >
            <CreativeGallery color={color} creatives={summary.creatives} />
          </ChartCard>
          {complementaryCard}
        </section>
      </>
    );
  }

  // Shorts: ritmo + complementares; investimento diário largo + vídeos.
  if (layout === "shorts") {
    return (
      <>
        <section className={`${rowA} lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]`}>
          {pace}
          {complementaryCard}
        </section>
        <section className={`${rowB} lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]`}>
          {complementary.strategy === "visualizacoes" ? (
            <ChartCard description="Taxas de visualização, conclusão, clique e custos do vídeo." minHeight={300} title="Desempenho do vídeo">
              <VideoRates metrics={complementary} summary={summary} />
            </ChartCard>
          ) : (
            spend
          )}
          {videos}
        </section>
      </>
    );
  }

  // In-Stream: funil de retenção + complementares; ritmo + vídeos.
  if (layout === "instream" && funnel) {
    return (
      <>
        <section className={`${rowA} lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]`}>
          <ChartCard description={funnel.description} minHeight={280} title={funnel.title}>
            <StageFunnel color={color} stages={funnel.stages} />
          </ChartCard>
          {complementaryCard}
        </section>
        <section className={`${rowB} lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]`}>
          {pace}
          {videos}
        </section>
      </>
    );
  }

  if (layout === "funil" && funnel) {
    return (
      <>
        <section className={`${rowA} lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]`}>
          <ChartCard description={funnel.description} minHeight={280} title={funnel.title}>
            <StageFunnel color={color} stages={funnel.stages} />
          </ChartCard>
          {complementaryCard}
        </section>
        <section className={`${rowB} lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]`}>
          {pace}
          {dailyTable}
        </section>
      </>
    );
  }

  if (layout === "heatmap" && summary.daily.length >= 14) {
    return (
      <>
        <section className={`${rowA} lg:grid-cols-[minmax(0,1.7fr)_minmax(0,0.8fr)]`}>
          <ChartCard
            description={`${strategy.metricLabel} por dia da semana ao longo da campanha. Cores mais fortes indicam dias de maior entrega.`}
            minHeight={240}
            scroll
            title="Mapa de calor da entrega"
          >
            <DeliveryHeatmap color={color} metricLabel={strategy.metricLabel} rows={summary.daily} />
          </ChartCard>
          {rings}
        </section>
        <section
          className={`${rowB} md:grid-cols-2 ${isRichMedia ? "" : "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]"}`}
        >
          {delivery}
          {spend}
          {isRichMedia ? null : complementaryCard}
        </section>
      </>
    );
  }

  if (layout === "tabela") {
    return (
      <>
        <section className={`${rowA} lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]`}>
          <ChartCard description="Metas e custos contratados lado a lado com o realizado." flush minHeight={220} scroll title="Contratado × realizado">
            <div className="px-3 pb-2">
              <ContractTable summary={summary} />
            </div>
          </ChartCard>
          {pace}
        </section>
        <section className={`${rowB} lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]`}>
          {dailyTable}
          {complementaryCard}
        </section>
      </>
    );
  }

  // Clássico (padrão e fallback dos demais quando faltam dados para o layout).
  // Com vídeos (HAWK e Connected TV, via planilha), o card de vídeos entra no
  // lugar do progresso/retenção.
  const hasVideos = summary.creatives.some((c) => c.video || c.driveVideo);
  if (hasVideos) {
    return (
      <>
        <section className={`${rowA} lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]`}>
          {pace}
          {delivery}
        </section>
        <section className={`${rowB} md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)]`}>
          {spend}
          {complementaryCard}
          {videos}
        </section>
      </>
    );
  }
  return (
    <>
      <section className={`${rowA} lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]`}>
        {pace}
        {delivery}
      </section>
      <section
        className={`${rowB} md:grid-cols-2 ${isRichMedia ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)]"}`}
      >
        {spend}
        {isRichMedia ? null : complementaryCard}
        {retention}
      </section>
    </>
  );
}

/** Rede de Pesquisa: big numbers, temas, corrida até a meta, top 10 e medidor. */
function SearchLinePage({
  summary,
  prev,
  next,
}: {
  summary: LineSummary;
  prev: (typeof lines)[number] | null;
  next: (typeof lines)[number] | null;
}) {
  const { line } = summary;
  const color = line.color;
  const impressions = summary.daily.reduce((acc, r) => acc + r.impressions, 0);
  const groups = new Set(summary.keywords.map((k) => k.adGroup)).size;
  const themes = keywordThemes(summary.keywords);
  const since = summary.flight
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Bahia",
      })
        .format(new Date(summary.flight.start))
        .replace(",", " às")
    : null;

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3 p-3 sm:p-4 fit:grid fit:h-full fit:grid-rows-[auto_auto_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <LineTitleBar next={next} prev={prev} summary={summary} />
        {!summary.hasData ? (
          <p className="flex items-center gap-2 self-start rounded-full bg-status-good px-3 py-1 text-xs text-status-good-foreground">
            <Radio aria-hidden className="size-3.5 shrink-0" />
            <span>
              <span className="font-semibold">Campanha no ar</span>
              {since ? ` desde ${since}` : ""} · aguardando as primeiras impressões
            </span>
          </p>
        ) : null}
      </div>

      {/* Big numbers */}
      <section aria-label="Indicadores da pesquisa" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          accent={color}
          colored
          hint={`de ${formatInt(line.contractedMetric)} contratados · ${formatProgress(summary.metricProgress)}`}
          icon={MousePointerClick}
          label="Cliques"
          value={summary.delivered}
        />
        <KpiCard
          accent="var(--brand-navy)"
          format={currencyFormat}
          hint={`de ${formatCurrencyInt(line.investment)} · ${formatProgress(summary.investmentProgress)}`}
          icon={Wallet}
          label="Investido"
          value={summary.spent}
        />
        <KpiCard
          accent="var(--brand-orange)"
          empty={summary.realizedUnitCost === null}
          format={currencyCentsFormat}
          hint={`contratado ${formatUnitCost(line.contractedUnitCost ?? 0)}`}
          icon={Coins}
          label="CPC realizado"
          value={summary.realizedUnitCost ?? 0}
        />
        <KpiCard
          accent="var(--brand-cyan)"
          empty={impressions === 0}
          format={{ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          hint={`${formatInt(impressions)} impressões`}
          icon={Percent}
          label="CTR"
          value={impressions > 0 ? summary.delivered / impressions : 0}
        />
        <KpiCard
          accent="var(--brand-lime)"
          hint={`${groups} ${groups === 1 ? "grupo" : "grupos"} de anúncios`}
          icon={KeyRound}
          label="Palavras-chave"
          value={summary.keywords.length}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] fit:min-h-0">
        <ChartCard
          description="Termos que mais aparecem nas palavras-chave da campanha (quantas palavras contêm cada termo)."
          minHeight={260}
          title="Sobre o que a campanha busca"
        >
          <KeywordThemesChart color={color} themes={themes} total={summary.keywords.length} />
        </ChartCard>
        <ChartCard description="Cliques por dia em barras; CTR e CPC médio acumulados em linhas, cada um na sua escala." minHeight={300} title="Cliques × CTR × CPC">
          <SearchDailyCombo color={color} contractedCpc={line.contractedUnitCost} rows={summary.daily} />
        </ChartCard>
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,0.8fr)] fit:min-h-0">
        <ChartCard description="As 10 palavras-chave com mais cliques." flush minHeight={300} scroll title="Top 10 palavras-chave">
          <div className="px-3 pb-2">
            <KeywordTable color={color} keywords={summary.keywords} limit={10} />
          </div>
        </ChartCard>
        <ChartCard description="Cliques entregues em relação à meta contratada." minHeight={240} title="Meta de cliques">
          <ClicksGauge clicks={summary.delivered} goal={line.contractedMetric} />
        </ChartCard>
      </section>
    </div>
  );
}

/** Página de uma linha sem dados: só o contratado + aviso, nenhum número simulado. */
function NoDataLinePage({
  summary,
  prev,
  next,
}: {
  summary: LineSummary;
  prev: (typeof lines)[number] | null;
  next: (typeof lines)[number] | null;
}) {
  const { line, strategy } = summary;
  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3 p-3 sm:p-4 fit:h-full">
      <LineTitleBar next={next} prev={prev} summary={summary} />
      <section aria-label="Contratado" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ContractStat icon={Target} label={`Meta contratada (${strategy.metricLabel})`} value={formatInt(line.contractedMetric)} />
        <ContractStat icon={Wallet} label="Investimento contratado" value={formatCurrencyInt(line.investment)} />
        <ContractStat
          icon={CalendarRange}
          label={strategy.unitCostLabel ? `${strategy.unitCostLabel} contratado` : "Custo unitário"}
          value={line.contractedUnitCost !== null ? formatUnitCost(line.contractedUnitCost) : "Não se aplica"}
        />
      </section>
      <NoDataNotice className="fit:flex-1" message={summary.message} />
    </div>
  );
}

function ContractStat({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
        <p className="font-heading text-xl font-extrabold tracking-tight">{value}</p>
      </div>
    </div>
  );
}
