"use client";

import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  Clapperboard,
  Headphones,
  LayoutGrid,
  Layers,
  type LucideIcon,
  Menu,
  MessageCircle,
  Monitor,
  Play,
  Search,
  Smartphone,
  Target,
  Tv,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { RefreshDataButton } from "@/components/layout/refresh-data-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { campaign, lines, strategies, strategyOrder } from "@/data";
import type { LineId } from "@/data/types";
import { formatDate, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

const lineIcons: Record<LineId, LucideIcon> = {
  "rich-media": Layers,
  "rede-display": Monitor,
  "video-hawk": Clapperboard,
  "rede-pesquisa": Search,
  "youtube-shorts": Smartphone,
  "youtube-instream": Play,
  "connected-tv": Tv,
  spotify: Headphones,
  whatsapp: MessageCircle,
};

const STORAGE_KEY = "elnino-sidebar-collapsed";
const CHANGE_EVENT = "elnino-sidebar-change";

/* Estado recolhido persistido por dispositivo (só conveniência de UI). */
function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* sem storage: o estado não persiste, mas a UI segue funcionando */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function AppSidebar({ lastUpdated }: { lastUpdated: string | null }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Fecha o drawer ao navegar (ajuste de estado durante o render, sem efeito).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  const toggle = () => writeCollapsed(!collapsed);

  const nav = (
    <TooltipProvider delay={150}>
      <SidebarNav collapsed={collapsed} pathname={pathname} />
    </TooltipProvider>
  );

  return (
    <>
      {/* Barra superior (mobile) */}
      <div className="m-3 mb-0 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm lg:hidden">
        <Brand />
        <button
          aria-controls="sidebar-drawer"
          aria-expanded={mobileOpen}
          aria-label="Abrir menu"
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-background"
          onClick={() => setMobileOpen(true)}
          type="button"
        >
          <Menu aria-hidden className="size-4.5" />
        </button>
      </div>

      {/* Drawer (mobile) */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-brand-navy-deep/50"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
          <aside
            className="absolute inset-y-3 left-3 flex w-[280px] max-w-[85vw] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
            id="sidebar-drawer"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <Brand />
              <button
                aria-label="Fechar menu"
                className="flex size-9 items-center justify-center rounded-xl hover:bg-muted"
                onClick={() => setMobileOpen(false)}
                type="button"
              >
                <X aria-hidden className="size-4.5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              <SidebarNav collapsed={false} pathname={pathname} />
            </div>
            <SidebarFooter collapsed={false} lastUpdated={lastUpdated} />
          </aside>
        </div>
      ) : null}

      {/* Sidebar (desktop) */}
      <aside
        className={cn(
          "relative my-3 ml-3 hidden shrink-0 flex-col rounded-2xl border border-border bg-card shadow-sm transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex",
          collapsed ? "w-[72px]" : "w-[264px]"
        )}
        data-collapsed={collapsed ? "" : undefined}
      >
        <div className={cn("flex items-center border-b border-border px-3 py-3", collapsed ? "justify-center" : "justify-between")}>
          <Brand compact={collapsed} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 [scrollbar-width:thin]">
          {nav}
        </div>

        <SidebarFooter collapsed={collapsed} lastUpdated={lastUpdated} />

        <TooltipProvider delay={150}>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  aria-expanded={!collapsed}
                  aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
                  className="absolute top-[18px] -right-3.5 z-10 flex size-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-brand-blue hover:text-white"
                  onClick={toggle}
                  type="button"
                />
              }
            >
              {collapsed ? <ChevronsRight aria-hidden className="size-4" /> : <ChevronsLeft aria-hidden className="size-4" />}
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {collapsed ? "Expandir menu" : "Recolher menu"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </aside>
    </>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link
        className="flex h-9 items-center font-heading text-sm font-extrabold tracking-tight"
        href="/"
        title="Página inicial"
      >
        <span className="sr-only">Embasa · Painel de campanha</span>
        <span aria-hidden className="text-brand-blue">E</span>
      </Link>
    );
  }
  return (
    <Link className="flex min-w-0 flex-col leading-tight" href="/" title="Página inicial">
      <span className="truncate font-heading text-base font-extrabold tracking-tight">Embasa</span>
      <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Painel de campanha
      </span>
    </Link>
  );
}

function SidebarNav({ collapsed, pathname }: { collapsed: boolean; pathname: string }) {
  return (
    <nav aria-label="Páginas" className="flex flex-col gap-4">
      <div>
        <p
          className={cn(
            "mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
            collapsed && "sr-only"
          )}
        >
          Campanha
        </p>
        <ul className="flex flex-col gap-0.5">
          <NavItem
            active={pathname === "/dashboard"}
            collapsed={collapsed}
            color="var(--brand-blue)"
            href="/dashboard"
            icon={LayoutGrid}
            label="Visão geral"
          />
          <NavItem
            active={pathname === "/metas"}
            collapsed={collapsed}
            color="var(--brand-lime)"
            href="/metas"
            icon={Target}
            label="Progresso de metas"
          />
        </ul>
      </div>
      {strategyOrder.map((strategyId) => {
        const group = lines.filter((line) => line.strategy === strategyId);
        return (
          <div key={strategyId}>
            <p
              className={cn(
                "mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
                collapsed && "sr-only"
              )}
            >
              {strategies[strategyId].label}
            </p>
            {collapsed ? <span aria-hidden className="mx-auto mb-1.5 block h-px w-6 bg-border" /> : null}
            <ul className="flex flex-col gap-0.5">
              {group.map((line) => (
                <NavItem
                  active={pathname === `/linhas/${line.id}`}
                  collapsed={collapsed}
                  color={line.color}
                  href={`/linhas/${line.id}`}
                  hint={line.navHint === null ? undefined : (line.navHint ?? line.channel)}
                  icon={lineIcons[line.id]}
                  key={line.id}
                  label={collapsed ? line.name : line.shortName}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function NavItem({
  href,
  label,
  hint,
  icon: Icon,
  color,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  color: string;
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl py-1.5 text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0" : "px-2",
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
      href={href}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
          active ? "text-white shadow-sm" : "text-muted-foreground group-hover:text-foreground"
        )}
        style={active ? { backgroundColor: color } : undefined}
      >
        <Icon aria-hidden className="size-4" />
      </span>
      {collapsed ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="min-w-0 flex-1 truncate">
          {label}
          {hint ? <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{hint}</span> : null}
        </span>
      )}
    </Link>
  );

  if (!collapsed) {
    return <li>{link}</li>;
  }

  // Recolhido: o nome da página aparece num tooltip à direita do ícone.
  return (
    <li>
      <Tooltip>
        <TooltipTrigger render={link} />
        <TooltipContent className="flex-col items-start gap-0 whitespace-nowrap" side="right" sideOffset={10}>
          <span className="font-semibold">{label}</span>
          {hint ? <span className="text-[11px] opacity-70">{hint}</span> : null}
        </TooltipContent>
      </Tooltip>
    </li>
  );
}

function SidebarFooter({ collapsed, lastUpdated }: { collapsed: boolean; lastUpdated: string | null }) {
  const period = `${formatDateShort(campaign.startDate)} — ${formatDate(campaign.endDate)}`;
  return (
    <TooltipProvider delay={150}>
      <div className={cn("flex shrink-0 flex-col gap-2 border-t border-border px-3 py-3 text-[11px] text-muted-foreground", collapsed && "items-center px-0 text-center")}>
        <RefreshDataButton collapsed={collapsed} lastUpdated={lastUpdated} />
        {collapsed ? (
          <span className="flex flex-col items-center gap-1" title={`Período da campanha: ${period}`}>
            <CalendarDays aria-hidden className="size-4" />
            <span className="font-semibold tabular-nums">{formatDateShort(campaign.endDate)}</span>
          </span>
        ) : (
          <p className="flex items-center gap-2">
            <CalendarDays aria-hidden className="size-3.5 shrink-0" />
            <span className="sr-only">Período da campanha:</span>
            <span className="truncate font-medium text-foreground">{period}</span>
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
