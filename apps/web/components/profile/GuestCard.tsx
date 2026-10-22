"use client";

import { useEffect } from "react";

import { useBackHandler } from "@/lib/backHandlers";

/** Okvirna veličina oblačića (CSS: max-width 14rem, visina ~3.5rem). */
const CARD_W = 224;
const CARD_H = 56;
const GAP = 6;
const EDGE = 8;

/**
 * Sjedište za stolom je usko — oblačić stoji pored njega (desno, pa lijevo).
 * Red u sobi je širok koliko ekran — tada ispod reda, ili iznad ako dolje
 * nema mjesta. Uvijek cijeli na ekranu.
 */
export function placeNear(anchor: DOMRect, vw: number, vh: number): { top: string; left: string } {
  const clampX = (x: number) => Math.min(Math.max(EDGE, x), vw - CARD_W - EDGE);
  const clampY = (y: number) => Math.min(Math.max(EDGE, y), vh - CARD_H - EDGE);
  const midY = anchor.top + anchor.height / 2 - CARD_H / 2;
  if (vw - anchor.right - GAP >= CARD_W + EDGE) {
    return { top: `${clampY(midY)}px`, left: `${anchor.right + GAP}px` };
  }
  if (anchor.left - GAP >= CARD_W + EDGE) {
    return { top: `${clampY(midY)}px`, left: `${anchor.left - GAP - CARD_W}px` };
  }
  const below = anchor.bottom + GAP + CARD_H + EDGE <= vh;
  return {
    top: `${clampY(below ? anchor.bottom + GAP : anchor.top - GAP - CARD_H)}px`,
    left: `${clampX(anchor.left)}px`,
  };
}

/**
 * T3 — igrač bez naloga: mali oblačić uz sjedište, samo slovo i nadimak, bez
 * akcija i linka. Zatvara se dodirom bilo gdje (i Escape / Android nazad).
 * Isti je za svakog bez naloga — gost i bot se ne razlikuju (G3).
 */
export function GuestCard({
  name,
  anchor,
  onClose,
}: {
  name: string;
  /** Pravougaonik sjedišta/reda na ekranu — oblačić stoji uz njega. */
  anchor: DOMRect;
  onClose: () => void;
}) {
  useBackHandler(true, onClose);

  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Sljedeći dodir bilo gdje — ne ovaj koji je oblačić otvorio.
    const id = setTimeout(() => document.addEventListener("pointerdown", close), 0);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const style = placeNear(anchor, window.innerWidth, window.innerHeight);

  return (
    <div className="guest-card" role="dialog" aria-label={name} style={style}>
      <span className="guest-card__letter" aria-hidden="true">
        {name.charAt(0).toLocaleUpperCase("sr-Latn")}
      </span>
      <span className="guest-card__name">{name}</span>
    </div>
  );
}
