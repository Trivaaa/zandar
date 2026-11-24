"use client";

import { TABLE_THEMES, type TableTheme } from "@zandar/shared-types";

import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { Sheet } from "@/components/sheet/Sheet";
import type { GameSlug } from "@/lib/games";
import { gamePlayHint, gameSettingsShape } from "@/lib/profileView";
import {
  QUICK_PLAY_COUNTS,
  QUICK_PLAY_TARGETS,
  readQuickPlayPrefs,
  saveQuickPlayPrefs,
  useQuickPlayPrefs,
} from "@/lib/quickPlayPrefs";
import { useRaubDeck, type RaubDeck } from "@/lib/settings";
import { sr } from "@/lib/sr";
import { saveTableTheme, useTableTheme } from "@/lib/tableTheme";
import { track } from "@/lib/track";

type TrackedGame = "zandar" | "poker" | "raub" | "bela";

const DECKS: readonly RaubDeck[] = ["hungarian", "french"];

/**
 * List igre iz Profila → „Moje igre" (SPEC_PROFIL_POSTAVKE §5, G1/G2).
 * Samo opcije koje stvarno mijenjaju igru. **Čuva se odmah** — dodir je upis,
 * a zatvaranje ne upisuje ništa samo od sebe (tako je nastao lažni „21").
 * „Igraj" nosi izbor u sebi i vodi pravo za sto.
 */
export function GameSettingsSheet({
  game,
  name,
  onPlay,
  onClose,
}: {
  game: GameSlug;
  name: string;
  onPlay: () => void;
  onClose: () => void;
}) {
  const t = sr.profileGames;
  const shape = gameSettingsShape(game);
  const prefs = useQuickPlayPrefs(game);
  const theme = useTableTheme(game);
  const [deck, setDeck] = useRaubDeck();
  const hint = gamePlayHint(game, prefs);

  const changed = (setting: "players" | "target" | "start_score" | "deck" | "table", value: string | number) =>
    track("game_setting_changed", { game: game as TrackedGame, setting, value });

  return (
    <Sheet title={t.sheetTitle(name)} closeLabel={t.close} onClose={onClose}>
      <div className="qp-sheet game-settings">
        {shape.players ? (
          <Segmented
            label={t.playersLabel}
            options={QUICK_PLAY_COUNTS.map((n) => ({ value: n, label: String(n) }))}
            selected={prefs.playerCount}
            onSelect={(playerCount) => {
              if (playerCount === prefs.playerCount) return;
              // Svjež zapis, ne `prefs` iz rendera: dva brza dodira se ne gaze.
              saveQuickPlayPrefs({ ...readQuickPlayPrefs(game), playerCount }, game);
              changed("players", playerCount);
            }}
          />
        ) : null}

        {shape.target ? (
          <Segmented
            label={shape.target === "from" ? t.fromLabel : t.toLabel}
            options={QUICK_PLAY_TARGETS.map((n) => ({
              value: n,
              label: String(n),
              note: n === 11 ? t.shorter : t.longer,
            }))}
            selected={prefs.targetScore}
            onSelect={(targetScore) => {
              if (targetScore === prefs.targetScore) return;
              saveQuickPlayPrefs({ ...readQuickPlayPrefs(game), targetScore }, game);
              changed(shape.target === "from" ? "start_score" : "target", targetScore);
            }}
          />
        ) : null}

        {shape.deck ? (
          <Segmented
            label={t.deckLabel}
            options={DECKS.map((d) => ({ value: d, label: t.deckNames[d] }))}
            selected={deck}
            onSelect={(next) => {
              if (next === deck) return;
              setDeck(next);
              changed("deck", next);
            }}
          />
        ) : null}

        <div className="create__field">
          <span className="create__label font-sans text-sm">{sr.tableTheme.label}</span>
          <div className="create__themes" role="radiogroup" aria-label={sr.tableTheme.label}>
            {TABLE_THEMES.map((th: TableTheme) => (
              <button
                key={th}
                type="button"
                role="radio"
                aria-checked={theme === th}
                className="create__theme font-sans text-sm"
                data-selected={theme === th}
                onClick={() => {
                  if (th === theme) return;
                  saveTableTheme(th, game);
                  changed("table", th);
                }}
              >
                <span className="create__theme-thumb" data-table={th} aria-hidden="true" />
                {sr.tableTheme.names[th]}
              </button>
            ))}
          </div>
        </div>

        <p className="game-settings__saved">
          <CheckIcon className="game-settings__saved-icon" />
          {t.saved}
        </p>

        <button type="button" className="home__cta sheet__btn game-settings__play" onClick={onPlay}>
          <span>{t.play}</span>
          <span className="game-settings__hint">
            {hint}
            <ArrowRightIcon className="home__cta-arrow" />
          </span>
        </button>
      </div>
    </Sheet>
  );
}

function Segmented<V extends string | number>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: ReadonlyArray<{ value: V; label: string; note?: string }>;
  selected: V;
  onSelect: (value: V) => void;
}) {
  return (
    <div className="create__field">
      <span className="create__label font-sans text-sm">{label}</span>
      <div className="create__segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected === o.value}
            className="create__option font-display text-base"
            data-selected={selected === o.value}
            onClick={() => onSelect(o.value)}
          >
            {o.label}
            {o.note ? <span className="game-settings__note font-sans">{o.note}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
