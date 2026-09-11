"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Uređajni okvir za /dev/game.
 *
 * Postoji zbog jedne tvrde granice: headless Chrome na Windowsu ne otvara prozor
 * uži od ~500 CSS px, pa `--window-size=360,760` daje SNIMAK 360px sirok, ali
 * stranicu i dalje slaze na ~492px. Sve mjere sa takvog snimka lazu, a ciljni
 * uređaj (S10e) je bas 360.
 *
 * Iframe ima svoj viewport: `100dvh`, `vw`, i media upiti unutra vide ovu
 * sirinu, ne prozorovu. Zato je ovo jedini nacin da se raspored na 360px izmjeri
 * headless-om.
 *
 *   /dev/frame?sizes=360x760,390x844&q=cards%3D9
 *   /dev/frame?sizes=380x900&path=/dev/overlays%23menu
 *
 * `path` (podrazumijevano /dev/game) uz to rjesava i drugu nezgodu: duge
 * galerije se headless-om ne mogu skrolovati, a iframe skroluje na svoj hash.
 */

type Size = { w: number; h: number };

function parseSizes(raw: string | null): Size[] {
  const fallback: Size[] = [
    { w: 360, h: 760 },
    { w: 390, h: 844 },
  ];
  if (!raw) return fallback;
  const out = raw
    .split(",")
    .map((s) => s.trim().split("x"))
    .filter((p) => p.length === 2)
    .map(([w, h]) => ({ w: Number(w), h: Number(h) }))
    .filter((s) => Number.isFinite(s.w) && Number.isFinite(s.h) && s.w > 0 && s.h > 0);
  return out.length > 0 ? out : fallback;
}

const subscribeToNothing = () => () => {};

export default function DevFramePage() {
  const search = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.search,
    () => "",
  );
  const { sizes, src } = useMemo(() => {
    const p = new URLSearchParams(search);
    const raw = p.get("path") ?? "/dev/game";
    // Samo interne /dev putanje: okvir ne postoji da bi ucitavao tudje stranice.
    const path = raw.startsWith("/dev/") ? raw : "/dev/game";
    const q = p.get("q") ?? "";
    const [base, hash] = path.split("#");
    const joined = q ? `${base}?${q}` : base;
    return { sizes: parseSizes(p.get("sizes")), src: hash ? `${joined}#${hash}` : joined };
  }, [search]);

  return (
    <div className="flex items-start gap-3 bg-black p-3">
      {sizes.map((s) => (
        <div key={`${s.w}x${s.h}`} className="flex flex-col gap-1">
          <span className="font-mono text-[11px] text-white">
            {s.w}×{s.h}
          </span>
          <iframe
            title={`${s.w}x${s.h}`}
            src={src}
            width={s.w}
            height={s.h}
            className="border-0 bg-black"
          />
        </div>
      ))}
    </div>
  );
}
