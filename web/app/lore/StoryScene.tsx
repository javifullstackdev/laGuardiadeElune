"use client";

import type { ReactNode } from "react";
import { ParchmentPanRoot, PanningCover } from "@/app/components/ui/PanningCover";

export default function StoryScene({
  coverUrl,
  children,
}: {
  coverUrl: string | null;
  children: ReactNode;
}) {
  return (
    <ParchmentPanRoot>
      <div className="relative min-h-[calc(100dvh-3rem)] overflow-hidden">
        {coverUrl ? (
          <PanningCover
            src={coverUrl}
            className="absolute inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[58%]"
            opacity={0.55}
            focusY={0.18}
          />
        ) : (
          <div className="absolute inset-0 bg-[#030712]" aria-hidden />
        )}
        {children}
      </div>
    </ParchmentPanRoot>
  );
}
