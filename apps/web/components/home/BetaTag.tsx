import type { GameConfig } from "@/lib/games";
import { sr } from "@/lib/sr";

/** Oznaka „BETA" uz ime igre (odluka 16) — zasebna od „Novo" / „Zakačeno". */
export function BetaTag({ game }: { game: Pick<GameConfig, "beta"> }) {
  if (!game.beta) return null;
  return (
    <span className="game-beta" aria-label={sr.beta.aria}>
      {sr.beta.tag}
    </span>
  );
}
