/**
 * Karta okrenuta naopako (poleđina).
 * Koristi se za prikaz tuđih karata u ruci.
 */
export function CardBack() {
  return (
    <div
      className="
        w-20 h-28
        bg-gradient-to-br from-red-800 to-red-950
        rounded-lg
        border-2 border-zinc-300
        shadow-md
        flex items-center justify-center
      "
    >
      <div className="w-14 h-22 border-2 border-red-300/40 rounded" />
    </div>
  );
}