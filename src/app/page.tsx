import { ArrowRight, BarChart3, CalendarDays, Layers, Target, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LandingStats, LandingStatsSkeleton } from "@/components/landing/landing-stats";
import { Reveal } from "@/components/motion/reveal";
import { campaign, lines } from "@/data";
import { formatCurrencyInt, formatDate } from "@/lib/format";

// Renderiza a cada acesso lendo o cache de dados das APIs (1h, em
// src/data/server/sources.ts). Assim o botão "Atualizar dados" aparece na hora.
export const dynamic = "force-dynamic";

export default function LandingPage() {
  return (
    <div className="hero-grain relative h-full overflow-y-auto text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 size-[34rem] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--brand-cyan), transparent 65%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 size-[30rem] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--brand-lime), transparent 65%)" }}
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center px-5 py-10 sm:px-8">
        <Reveal className="flex flex-wrap items-center gap-4" y={10}>
          <span className="inline-flex items-center rounded-2xl bg-white px-4 py-2.5 shadow-lg shadow-black/20">
            <Image
              alt="Embasa"
              className="h-9 w-auto sm:h-10"
              height={80}
              priority
              src="/brand/embasa-logo.svg"
              width={259}
            />
          </span>
        </Reveal>

        <Reveal className="mt-8" delay={0.05}>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">
            <BarChart3 aria-hidden className="size-3.5 text-brand-yellow" />
            Painel de mídia digital
          </p>
          <h1 className="font-heading text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
            Dashboard de acompanhamento
            <br />
            <span className="text-brand-yellow">das mídias digitais da campanha.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm text-white/75 sm:text-base">
            Investimento, entrega da métrica contratada e ritmo de cada linha de mídia,
            em uma visão geral consolidada e em páginas por plataforma. Dados atualizados
            diariamente a partir das plataformas de mídia.
          </p>
        </Reveal>

        <Reveal className="mt-7 flex flex-wrap gap-2 text-xs" delay={0.1} y={10}>
          <Chip icon={Layers} label="Linhas de mídia" value={`${lines.length} plataformas`} />
          <Chip icon={CalendarDays} label="Período" value={`${formatDate(campaign.startDate)} – ${formatDate(campaign.endDate)}`} />
          <Chip icon={Wallet} label="Contratado" value={formatCurrencyInt(campaign.totalInvestment)} />
        </Reveal>

        <Reveal className="mt-6" delay={0.15} y={10}>
          <Suspense fallback={<LandingStatsSkeleton />}>
            <LandingStats />
          </Suspense>
        </Reveal>

        <Reveal className="mt-8 flex flex-col gap-3 sm:flex-row" delay={0.2} y={10}>
          <Link
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-yellow px-7 font-heading text-sm font-extrabold text-brand-navy-deep shadow-lg shadow-black/20 transition-colors hover:bg-brand-lime"
            href="/dashboard"
          >
            Acessar Dashboard
            <ArrowRight aria-hidden className="size-4" />
          </Link>
          <Link
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 font-heading text-sm font-extrabold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            href="/metas"
          >
            <Target aria-hidden className="size-4" />
            Acessar Progresso de Metas
          </Link>
        </Reveal>

      </div>
    </div>
  );
}

function Chip({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
      <Icon aria-hidden className="size-3.5 text-white/60" />
      <span className="text-white/60">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
