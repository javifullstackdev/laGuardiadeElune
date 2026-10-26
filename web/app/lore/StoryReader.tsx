"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { textToParagraphs, formatDate } from "@/lib/posts";
import { fitToOneLine } from "@/lib/fit-line";
import ShareBar from "@/app/components/ShareBar";
import Breadcrumb, { type Crumb } from "@/app/components/Breadcrumb";
import Parchment from "@/app/components/ui/Parchment";
import { ParchmentPanRoot, PanningCover } from "@/app/components/ui/PanningCover";
import { characterSignature, type StoryPublic } from "@/lib/stories";
import { relationLabel } from "@/lib/relations";
import { STORY_READING_COOKIE, type StoryReadingMode } from "@/lib/story-reading";
import { Toggle } from "@/components/base/toggle/toggle";

type Phase = "parchment" | "to-comfort" | "comfort" | "to-parchment";

const TO_COMFORT_MS = 2000;
const TO_PARCHMENT_MS = 1600;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function highlightNames(text: string, names: string[], nameClass: string) {
  if (!names.length) return text;
  const escaped = names
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return text;
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  return text.split(re).map((part, i) =>
    names.some((n) => n.toLowerCase() === part.toLowerCase()) ? (
      <span key={`${part}-${i}`} className={nameClass}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function ScrollSection({
  title,
  text,
  names,
  nameClass,
}: {
  title?: string;
  text: string | null;
  names: string[];
  nameClass: string;
}) {
  if (!text?.trim()) return null;
  return (
    <section>
      {title ? <h2>{title}</h2> : null}
      {textToParagraphs(text).map((p, i) => (
        <p key={i}>{highlightNames(p, names, nameClass)}</p>
      ))}
    </section>
  );
}

function StoryBody({
  story,
  nameClass,
}: {
  story: StoryPublic;
  nameClass: string;
}) {
  const names = story.relations.map((r) => r.name);
  const hasBio = Boolean(story.biography?.trim());
  const hasPers = Boolean(story.personality?.trim());
  return (
    <>
      <ScrollSection text={story.biography} names={names} nameClass={nameClass} />
      <ScrollSection
        title={hasBio ? "Personalidad" : undefined}
        text={story.personality}
        names={names}
        nameClass={nameClass}
      />
      <ScrollSection
        title={hasBio || hasPers ? "Aspecto físico" : undefined}
        text={story.appearance}
        names={names}
        nameClass={nameClass}
      />
    </>
  );
}

function ComfortTitle({ title }: { title: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;

    let frame = 0;
    let lastWidth = -1;

    const fit = () => {
      const width = box.clientWidth;
      if (width < 8) return;
      if (Math.abs(width - lastWidth) < 0.5 && el.style.fontSize) return;
      lastWidth = width;
      const max = Number.parseFloat(getComputedStyle(el).getPropertyValue("--title-max")) || 48;
      const min = Number.parseFloat(getComputedStyle(el).getPropertyValue("--title-min")) || 16;
      fitToOneLine(el, max, min);
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };

    fit();
    const observer = new ResizeObserver(schedule);
    observer.observe(box);
    void document.fonts?.ready.then(() => {
      lastWidth = -1;
      schedule();
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [title]);

  return (
    <h1 ref={ref} className="story-read-title font-quest-display font-bold">
      {title}
    </h1>
  );
}

function StatusBadge({ status }: { status: StoryPublic["status"] }) {
  if (!status || status === "approved") return null;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-300 shrink-0">
      {status === "pending" ? "Pendiente de revisión" : "Rechazada"}
    </span>
  );
}

function StoryRelations({ story }: { story: StoryPublic }) {
  if (story.relations.length === 0) return null;
  return (
    <section className="pt-8 max-w-2xl">
      <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Relaciones</h2>
      <ul className="space-y-2">
        {story.relations.map((r) => (
          <li key={`${r.name}-${r.realm}`} className="text-sm text-gray-300">
            <span className="text-white">{r.name}</span>
            {" · "}
            {relationLabel(r.relation_type)}
            {r.met_at ? ` · se conocieron en ${r.met_at}` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

function StoryParchment({
  story,
  actions,
  isHordeChar = false,
}: {
  story: StoryPublic;
  actions?: ReactNode;
  isHordeChar?: boolean;
}) {
  return (
    <Parchment
      title={story.title}
      subtitle={story.subtitle}
      fitTitle
      titleFont="display"
      author={characterSignature(story) || story.author_username}
      actions={actions}
      isHorde={isHordeChar}
    >
      <StoryBody story={story} nameClass="text-[#5c2a78] font-semibold" />
    </Parchment>
  );
}

export default function StoryReader({
  story,
  isHordeStory,
  loggedIn,
  initialMode,
}: {
  story: StoryPublic;
  isHordeStory: boolean;
  loggedIn: boolean;
  initialMode: StoryReadingMode;
}) {
  const [phase, setPhase] = useState<Phase>(initialMode === "comfort" ? "comfort" : "parchment");
  const [entrance, setEntrance] = useState(initialMode === "parchment");
  const sceneRef = useRef<HTMLElement>(null);
  const chromeRef = useRef<HTMLElement>(null);
  const [navSlot, setNavSlot] = useState<HTMLElement | null>(null);
  const comfortRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const hasLore = Boolean(story.biography || story.personality || story.appearance);
  const look: StoryReadingMode =
    phase === "parchment" || phase === "to-parchment" ? "parchment" : "comfort";
  const sceneOpen = phase === "comfort" || phase === "to-parchment";
  const busy = phase !== "parchment" && phase !== "comfort";
  const crumbs: Crumb[] = [
    { href: "/", label: "Inicio" },
    { href: "/lore", label: "Historias" },
    { label: story.title },
  ];
  const canShare = !story.status || story.status === "approved";
  const shareActions = canShare ? (
    <ShareBar
      variant="parchment"
      targetType="story"
      targetId={story.id}
      title={story.title}
      loggedIn={loggedIn}
    />
  ) : undefined;
  const signature = characterSignature(story) || story.author_username;

  useLayoutEffect(() => {
    setNavSlot(document.getElementById("story-reading-toggle-slot"));
  }, []);

  useEffect(() => {
    if (!entrance) return;
    const timeout = window.setTimeout(() => setEntrance(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [entrance]);

  useEffect(() => {
    if (phase !== "to-comfort" && phase !== "to-parchment") return;
    const wait = prefersReducedMotion() ? 0 : phase === "to-comfort" ? TO_COMFORT_MS : TO_PARCHMENT_MS;
    const timeout = window.setTimeout(() => {
      setPhase(phase === "to-comfort" ? "comfort" : "parchment");
    }, wait);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (!busy) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [busy]);

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    const chrome = chromeRef.current;
    const comfort = comfortRef.current;
    const lead = leadRef.current;
    const rule = ruleRef.current;
    if (!scene || !chrome) return;
    const pageTop = (el: HTMLElement) => {
      const previousPosition = el.style.position;
      const previousTop = el.style.top;
      el.style.position = "static";
      el.style.top = "auto";
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.position = previousPosition;
      el.style.top = previousTop;
      return top;
    };
    const apply = () => {
      const margin = Number.parseFloat(getComputedStyle(chrome).marginBottom) || 0;
      scene.style.setProperty("--story-chrome", `${chrome.offsetHeight + margin}px`);
      const headerTop = pageTop(chrome);
      if (comfort && lead) {
        const overlap = headerTop + chrome.offsetHeight - pageTop(lead);
        if (overlap > 1) {
          const current = Number.parseFloat(comfort.style.paddingTop) || 0;
          comfort.style.paddingTop = `${current + overlap}px`;
        }
      }
      const leadTop = lead ? pageTop(lead) : headerTop + chrome.offsetHeight;
      const ruleStick = lead ? leadTop + lead.offsetHeight : leadTop;
      scene.style.setProperty("--pin-header", `${headerTop}px`);
      scene.style.setProperty("--pin-lead", `${leadTop}px`);
      scene.style.setProperty("--pin-rule", `${ruleStick}px`);
      scene.style.setProperty("--pin-fade", `${ruleStick + (rule?.offsetHeight ?? 0)}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(chrome);
    if (lead) observer.observe(lead);
    if (rule) observer.observe(rule);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  function chooseMode(next: StoryReadingMode) {
    if (busy || next === look) return;
    document.cookie = `${STORY_READING_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "auto" });
    if (prefersReducedMotion()) {
      setPhase(next);
      return;
    }
    setPhase(next === "comfort" ? "to-comfort" : "to-parchment");
  }

  const entranceClass = entrance ? "animate-parchment-up" : "";
  const readingToggle = (
    <Toggle
      size="sm"
      label="Lectura cómoda"
      hint="Otra forma de leer la historia"
      isSelected={look === "comfort"}
      onChange={(selected) => chooseMode(selected ? "comfort" : "parchment")}
    />
  );

  return (
    <main className="relative text-white">
      <ParchmentPanRoot>
        <section
          ref={sceneRef}
          className="story-scene relative"
          data-mode={look}
          data-open={sceneOpen ? "true" : "false"}
          data-settled={phase === "comfort" || phase === "parchment" ? "true" : "false"}
        >
          <div className="story-bg">
            {story.cover_url ? (
              <PanningCover
                src={story.cover_url}
                alt=""
                className="absolute inset-0 min-[1440px]:inset-y-0 min-[1440px]:right-0 min-[1440px]:left-auto min-[1440px]:w-[58%]"
                opacity={0.55}
                focusY={0.18}
              />
            ) : null}
          </div>

          <header
            ref={chromeRef}
            className="story-chrome pointer-events-none relative z-30 px-4 pt-3 pb-3 sm:pb-4 sm:pt-6 min-[1440px]:pl-[clamp(25rem,28vw,32rem)] min-[1440px]:pr-20"
          >
            {look !== "comfort" ? <h1 className="sr-only">{story.title}</h1> : null}
            <div className="flex items-start justify-between gap-3 md:gap-4">
              <div className="pointer-events-auto min-w-0 flex-1">
                <Breadcrumb className="mb-0" items={crumbs} />
              </div>
              <div className="pointer-events-auto flex shrink-0 items-start gap-2">
                <StatusBadge status={story.status} />
                <div className="hidden md:block">{readingToggle}</div>
              </div>
            </div>
          </header>
          {navSlot
            ? createPortal(
                <Toggle
                  size="sm"
                  label="Lectura cómoda"
                  isSelected={look === "comfort"}
                  onChange={(selected) => chooseMode(selected ? "comfort" : "parchment")}
                />,
                navSlot,
              )
            : null}

          <div className="story-parchment-move">
              <div className="absolute inset-0 min-[1440px]:hidden">
                {hasLore ? (
                  <div className={`wiki-mobile-lore pointer-events-auto absolute inset-0 overflow-hidden ${entranceClass}`}>
                    <StoryParchment story={story} actions={shareActions} isHordeChar={isHordeStory} />
                  </div>
                ) : (
                  <div className="pointer-events-auto absolute inset-0 flex items-center justify-center px-6">
                    <p className="text-center text-sm text-white/60">
                      Esta historia aún no tiene texto publicado.
                    </p>
                  </div>
                )}
              </div>
              <div className="hidden h-full flex-col px-4 min-[1440px]:flex min-[1440px]:pl-[clamp(25rem,28vw,32rem)] min-[1440px]:pr-20">
                <div className="shrink-0" style={{ height: "var(--story-chrome, 5.5rem)" }} />
                {hasLore ? (
                  <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch">
                    <div className={`pointer-events-auto min-h-0 shrink-0 lg:self-end story-large-parchment ${entranceClass}`}>
                      <StoryParchment story={story} actions={shareActions} isHordeChar={isHordeStory} />
                    </div>
                  </div>
                ) : null}
              </div>
          </div>

          <div ref={comfortRef} className="story-comfort relative z-10 pb-16 min-[1440px]:pl-[clamp(25rem,28vw,32rem)] min-[1440px]:pr-20" inert={look !== "comfort"}>
            <div className="mx-auto w-full max-w-[76rem] px-6 sm:max-[1439px]:px-8 min-[1440px]:px-0">
            <div ref={leadRef} className="story-read-lead bg-[#030712] pb-8">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-purple-400/30 bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-200">
                  Historia
                </span>
                {story.published_at ? (
                  <span className="text-sm text-gray-500">{formatDate(story.published_at)}</span>
                ) : null}
              </div>
              <ComfortTitle title={story.title} />
              {story.subtitle ? <p className="story-read-kicker">{story.subtitle}</p> : null}
            </div>
            {story.cover_url ? (
              <div className="story-read-cover relative z-0 mb-2 overflow-hidden rounded-2xl border border-gray-800 lg:mb-24">
                <img
                  src={story.cover_url}
                  alt={`Portada: ${story.title}`}
                  className="w-full max-h-[min(65svh,720px)] object-cover"
                />
              </div>
            ) : null}
            <div ref={ruleRef} className="story-read-rule bg-[#030712]">
              <div className="h-px bg-gradient-to-r from-yellow-500/40 to-transparent" />
            </div>
            <div className="story-read-fade" aria-hidden />
            <div className="story-read-text">
              {hasLore ? (
                <div className="story-prose">
                  <StoryBody story={story} nameClass="font-semibold text-violet-300" />
                </div>
              ) : (
                <p className="text-sm text-white/60">Esta historia aún no tiene texto publicado.</p>
              )}
              {signature ? (
                <p className="mt-12 text-right text-base font-semibold italic tracking-wide text-gray-400 sm:text-lg">
                  {signature}
                </p>
              ) : null}
              {canShare ? (
                <ShareBar
                  targetType="story"
                  targetId={story.id}
                  title={story.title}
                  loggedIn={loggedIn}
                />
              ) : null}
              <StoryRelations story={story} />
            </div>
            </div>
          </div>
        </section>
      </ParchmentPanRoot>

      {phase === "parchment" && story.relations.length > 0 ? (
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-8">
          <StoryRelations story={story} />
        </div>
      ) : null}
    </main>
  );
}
