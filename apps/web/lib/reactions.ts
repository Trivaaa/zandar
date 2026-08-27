import type { ReactionType } from "@zandar/shared-types";

/**
 * 8 reakcija — jedini izvor emojija i redoslijeda. Tekst (aria-label/title)
 * živi u `lib/sr.ts` pod `reactions.labels`, kao i sva ostala vidljiva copy.
 */
export const REACTIONS: {
  type: ReactionType;
  emoji: string;
}[] = [
  { type: "laugh", emoji: "😂" },
  { type: "wow", emoji: "😮" },
  { type: "fire", emoji: "🔥" },
  { type: "clap", emoji: "👏" },
  { type: "cry", emoji: "😭" },
  { type: "angry", emoji: "😠" },
  { type: "thinking", emoji: "🤔" },
  { type: "respect", emoji: "🙌" },
];

export function getReactionEmoji(type: ReactionType): string {
  return REACTIONS.find((r) => r.type === type)?.emoji ?? "?";
}
/**
 * Reakcija koja je trenutno vidljiva na stolu (ephemeralno, klijentska strana).
 * Server šalje samo reaction event; UI mu dodjeljuje `id` radi animacije/uklanjanja.
 */
export type ActiveReaction = {
  id: string;
  playerId: string;
  type: string;
};
