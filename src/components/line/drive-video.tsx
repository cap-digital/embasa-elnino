"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Vídeo do Google Drive: miniatura (via /api/drive-thumbnail) e, ao clicar,
 * o player embutido do Drive no próprio card (sem link para a página do Drive).
 * Requer o arquivo compartilhado como "qualquer pessoa com o link".
 */
export function DriveVideoPreview({
  fileId,
  title,
}: {
  fileId: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    // Tocando, ocupa a largura toda do card (a miniatura é pequena demais para assistir).
    <div
      className={cn(
        "relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-muted",
        playing ? "basis-full" : "@sm:w-44"
      )}
    >
      {playing ? (
        <>
          <iframe
            allow="autoplay; fullscreen"
            allowFullScreen
            className="absolute inset-0 size-full border-0"
            src={`https://drive.google.com/file/d/${fileId}/preview`}
            title={title}
          />
          {/* Cobre o botão "abrir em nova janela" do player: não levamos ao Drive. */}
          <div aria-hidden className="absolute top-0 right-0 size-16" />
        </>
      ) : (
        <button
          aria-label={`Assistir “${title}”`}
          className="group absolute inset-0 block size-full cursor-pointer"
          onClick={() => setPlaying(true)}
          type="button"
        >
          <Image
            alt={`Miniatura do vídeo ${title}`}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            fill
            sizes="(min-width: 640px) 176px, 100vw"
            src={`/api/drive-thumbnail/${fileId}`}
            unoptimized
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/95 text-brand-navy shadow-md">
              <Play aria-hidden className="ml-0.5 size-5 fill-current" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
