"use client";

import type { ReactionType } from "@zandar/shared-types";
import { REACTIONS, getReactionEmoji } from "@/lib/reactions";
import { sr } from "@/lib/sr";

/**
 * EmojiReactions — dvije prezentacijske polovine istog sloja:
 *  - `EmojiReactionRow`: 4×2 grid od 8 reakcija (44px meta). Bez cooldowna —
 *    `disabled` je riječ roditelja (`ReactionFab` drži cooldown i pauzu).
 *  - `ReactionBubble`: jedan emoji uz sjedište pošiljaoca.
 *
 * Emoji i redoslijed dolaze iz `lib/reactions.ts` (jedini izvor, dijeli ga i
 * server-side tip `ReactionType`); tekst iz `lib/sr.ts`. Namjerno se ovdje ne
 * drži druga mapa emojija — dva izvora se raziđu prvom izmjenom.
 */

export type EmojiReactionRowProps = {
  onSend: (type: ReactionType) => void;
  disabled: boolean;
  className?: string | undefined;
};

export function EmojiReactionRow({
  onSend,
  disabled,
  className = "",
}: EmojiReactionRowProps) {
  return (
    <div
      className={`reactions ${className}`}
      data-disabled={disabled}
      role="group"
      aria-label={sr.reactions.title}
    >
      {REACTIONS.map(({ type, emoji }) => (
        <button
          key={type}
          type="button"
          className="reactions__btn"
          disabled={disabled}
          onClick={() => onSend(type)}
          aria-label={sr.reactions.labels[type]}
          title={sr.reactions.labels[type]}
        >
          <span className="reactions__glyph" aria-hidden="true">
            {emoji}
          </span>
        </button>
      ))}
    </div>
  );
}

export type ReactionBubbleProps = {
  type: ReactionType;
  visible: boolean;
  className?: string | undefined;
};

export function ReactionBubble({
  type,
  visible,
  className = "",
}: ReactionBubbleProps) {
  if (!visible) return null;

  return (
    <span className={`bubble ${className}`} data-reaction={type} role="status">
      <span className="bubble__glyph" aria-hidden="true">
        {getReactionEmoji(type)}
      </span>
      <span className="sr-only-text">{sr.reactions.labels[type]}</span>
    </span>
  );
}
