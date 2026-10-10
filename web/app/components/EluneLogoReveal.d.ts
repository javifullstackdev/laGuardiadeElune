import type { ReactElement } from "react";

export const TOTAL: number;

type Props = {
  size?: number;
  background?: string;
  assetsPath?: string;
  startOnView?: boolean;
  /** Controlled scrub time in seconds; omit for realtime clock */
  time?: number;
  onComplete?: () => void;
};

export default function EluneLogoReveal(props: Props): ReactElement;
