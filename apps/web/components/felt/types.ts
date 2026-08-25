/**
 * Tipovi za felt sloj.
 *
 * Sve osim `CardSize` dolazi iz `@zandar/shared-types` — oblici se poklapaju
 * 1:1 sa onim što je Lovable generisao, pa nema adaptera. `CardSize` je čisto
 * prezentacijski (geometrija karte) i ne postoji na serveru.
 */

export type {
  Card,
  Suit,
  Rank,
  ConnectionStatus,
  PublicPlayer,
  CaptureOption,
  CaptureReason,
} from "@zandar/shared-types";

export type CardSize = "xs" | "sm" | "md" | "lg";
