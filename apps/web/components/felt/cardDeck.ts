"use client";

import { createContext, useContext } from "react";

/**
 * Komplet karata za crtanje. Motor i server uvijek rade sa francuskim
 * `Card` (suit/rank); mađarice su SAMO prikaz — Raub (odluka 12, 8.11.2026).
 * Ekran igre postavlja komplet kroz kontekst, početna kroz prop.
 */
import type { CardDeck } from "@/lib/hungarianDeck";

export type { CardDeck };

export const CardDeckContext = createContext<CardDeck>("french");

export const useCardDeck = (override?: CardDeck): CardDeck => {
  const fromContext = useContext(CardDeckContext);
  return override ?? fromContext;
};

export { HU_SUIT, HU_SUIT_NAME, huAsset, huRankLabel, huSuitIcon } from "@/lib/hungarianDeck";
