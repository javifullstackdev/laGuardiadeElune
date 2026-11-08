"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  BANK_GOAL_PATH,
  BANK_GOAL_TITLE,
  formatMoney,
  goalHeadline,
  shownMoney,
  type GoldContributor,
} from "@/lib/gold";

type GoalCardGold = {
  goal_copper: number;
  confirmed_copper: number;
  pending_copper: number;
  contributors?: GoldContributor[];
};

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.256 1.36.22 1.872.133.571-.096 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden fill="currentColor">
      <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.1.1 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.1 16.1 0 0 0-4.8 0c-.14-.34-.36-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.02.01.05 0 .06-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.04.06.05.09.02 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z" />
    </svg>
  );
}

export default function GoalCard({
  gold,
  heading = "h2",
  showAchievement = false,
  action,
}: {
  gold: GoalCardGold;
  heading?: "h1" | "h2";
  showAchievement?: boolean;
  action?: ReactNode;
}) {
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [manualCopy, setManualCopy] = useState<string | null>(null);
  const goal = gold.goal_copper > 0 ? gold.goal_copper : 1;
  const percent = Math.min(100, (gold.confirmed_copper / goal) * 100);
  const barWidth = gold.confirmed_copper > 0 ? `max(8px, ${percent}%)` : "0%";
  const headline = goalHeadline(gold.confirmed_copper, gold.goal_copper);
  const roster = gold.contributors ?? [];
  const Title = heading;

  useEffect(() => {
    setShareUrl(`${window.location.origin}${BANK_GOAL_PATH}`);
  }, []);

  const message = shareUrl ? `${headline}\n${shareUrl}` : headline;
  const whatsapp = shareUrl ? `https://wa.me/?text=${encodeURIComponent(message)}` : undefined;

  async function copyForDiscord() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(message);
      setManualCopy(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setManualCopy(message);
    }
  }

  return (
    <section className="mb-8 overflow-hidden rounded-xl border border-yellow-500/35 bg-gray-950">
      <div className="h-1 bg-yellow-500" />
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-3">
          <img src="/missions/quest.png" alt="" className="h-10 w-auto shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-yellow-500">Misión de la Guardia</p>
            <Title className="mt-1 font-quest text-2xl font-semibold leading-none tracking-wide text-gray-100 sm:text-3xl">
              {BANK_GOAL_TITLE}
            </Title>
          </div>
        </div>

        <p className="mt-6 font-quest text-xl font-semibold leading-snug tracking-wide text-yellow-300 sm:text-3xl">
          {headline}
        </p>

        <div className="mt-5">
          <div className="mb-2 flex justify-between gap-4 text-xs text-gray-400">
            <span>{shownMoney(gold.confirmed_copper)}</span>
            <span>{shownMoney(gold.goal_copper)}</span>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-gray-800">
            <div className="h-full bg-yellow-400 transition-[width] duration-500" style={{ width: barWidth }} />
          </div>
          {gold.pending_copper > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              Hay {formatMoney(gold.pending_copper)} pendientes de confirmar.
            </p>
          )}
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-400">
          No todo el mundo podrá presumir de haber invertido al menos 5 oros en la primera pestaña del banco de la Guardia.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100 hover:bg-yellow-500/20"
            >
              <WhatsAppIcon />
              WhatsApp
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-lg border border-gray-800 px-3 py-2 text-sm text-gray-500">
              <WhatsAppIcon />
              WhatsApp
            </span>
          )}
          <button
            type="button"
            onClick={() => void copyForDiscord()}
            className="inline-flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100 hover:bg-yellow-500/20"
          >
            <DiscordIcon />
            {copied ? "Copiado" : "Discord"}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {copied
            ? "Pégalo en Discord. La tarjeta lleva el progreso de ahora."
            : "Al pegar el enlace, la tarjeta muestra el objetivo y lo que falta en ese momento."}
        </p>
        {manualCopy && (
          <textarea
            readOnly
            value={manualCopy}
            rows={3}
            className="mt-3 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200"
            aria-label="Anuncio para copiar"
          />
        )}

        {action ? <div className="mt-5">{action}</div> : null}

        {showAchievement ? (
          <div className="mt-6">
            <h3 className="font-quest font-semibold leading-none tracking-wide text-gray-100">Participantes</h3>
            {roster.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {roster.map((row) => (
                  <li key={row.username} className="text-sm text-gray-300">
                    {row.username}: {formatMoney(row.copper)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-500">Todavía no hay oro confirmado.</p>
            )}
          </div>
        ) : null}

        {showAchievement && (
          <div className="mt-6">
            <p className="font-quest font-semibold leading-none tracking-wide text-gray-100">
              Logro: Invirtiendo en la Guardia
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Se concede al completar el objetivo, si has ingresado 5 de oro o más entre todos tus personajes.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
