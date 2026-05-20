import type { ReactionType } from "@zandar/shared-types";

export const REACTIONS: {
  type: ReactionType;
  emoji: string;
  label: string;
}[] = [
  { type: "laugh", emoji: "😂", label: "Smijeh" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "fire", emoji: "🔥", label: "Vatra" },
  { type: "clap", emoji: "👏", label: "Aplauz" },
  { type: "cry", emoji: "😭", label: "Plač" },
  { type: "angry", emoji: "😠", label: "Ljutnja" },
  { type: "thinking", emoji: "🤔", label: "Razmišljanje" },
  { type: "respect", emoji: "🙌", label: "Respekt" },
];

export function getReactionEmoji(type: ReactionType): string {
  return REACTIONS.find((r) => r.type === type)?.emoji ?? "?";
}