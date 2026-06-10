"use client";

/**
 * CardBack — jedinstvena poleđina karte (DS §10 smjer: felt + zlato).
 *
 * Zlatna rešetka rombova na felt-podlozi + tanka zlatna ivica. Token-only
 * (boje preko `--accent` / `--surface-raised`) → Ex-Yu skin je values-swap, ne
 * rewrite. Dekorativna (aria-hidden), bez info-leak-a (sve poleđine izgledaju
 * isto za bota i čovjeka — §7.1).
 *
 * Dijele je: lepeze poleđina protivnika (SeatBubble), špil (DeckPile) i
 * deal-duhovi (flyAnimation) → jedan vizuelni jezik = konzistentan polish.
 *
 * Veličine (poker-proporcija ~1:1.4, osim `sm` koji je landscape za bočne):
 *  - xs  30×42  partner (gore)
 *  - sm  52×36  bočni protivnici (landscape)
 *  - md  46×64  špil
 *  - lg  64×96  generička velika poleđina
 */

const SIZES = {
  xs: "w-[30px] h-[42px]",
  sm: "w-[52px] h-[36px]",
  md: "w-[46px] h-[64px]",
  lg: "w-16 h-24",
} as const;

// Zlatna rešetka rombova: dvije ukrštene repeating-linear-gradient linije.
const LATTICE =
  "repeating-linear-gradient(45deg, color-mix(in srgb, var(--accent) 34%, transparent) 0 1px, transparent 1px 7px), " +
  "repeating-linear-gradient(-45deg, color-mix(in srgb, var(--accent) 34%, transparent) 0 1px, transparent 1px 7px)";

type Props = {
  size?: keyof typeof SIZES;
  className?: string;
};

export function CardBack({ size = "md", className = "" }: Props) {
  return (
    <div
      aria-hidden
      className={`${SIZES[size]} rounded-token-md bg-surface-raised border border-accent/50 shadow-md overflow-hidden ${className}`}
    >
      <div
        className="h-full w-full rounded-token-md"
        style={{
          backgroundImage: LATTICE,
          boxShadow:
            "inset 0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent)",
        }}
      />
    </div>
  );
}
