"use client";

import { createContext } from "react";

export const ParchmentScrollContext = createContext<((progress: number) => void) | null>(null);
