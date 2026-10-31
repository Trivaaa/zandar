"use client";

import { useCallback, useEffect, useState } from "react";
import { HAPTIC, vibrate } from "@/lib/haptics";
import { prefersReducedMotion } from "@/lib/motion";
import {
  EMPTY_QUEUE,
  enqueueNews,
  finishNews,
  settleNews,
  startNextNews,
  type NewsQueue,
  type ScoreNewsItem,
} from "@/lib/scoreBar";
import { playSfx } from "@/lib/sound";

/**
 * Sat vijesti: 200 ms ulaz, 1500 ms stoji, 200 ms izlaz. Trajanje PRIKAZA, pa je
 * ovdje u JS-u (isti razlog kao `CAPTION_MS` u `useTableBeat`), a CSS ga dobija
 * kroz `--news-ms`, da se dvije vrijednosti ne mogu razići.
 */
export const NEWS_MS = 1900;
const NEWS_SETTLE_MS = 1700;
/** Bez pokreta nema ni ulaza ni izlaza: vijest samo zamijeni rezultat. */
const NEWS_REDUCED_MS = 1500;

/**
 * Red vijesti u traci rezultata.
 *
 * `ready` drži vijest dok karta slijeće: snapshot stiže prije nego što je potez
 * vidljiv, pa bi vijest odala ishod. Red je stanje, a ne `onCollect`, jer novi
 * potez poništava tajmere beat-a i vijest vezana za njih bi se izgubila.
 *
 * `scope` je ruka u toku: kad se promijeni (nova ruka, revanš, pauza), red se
 * prazni, da stara vijest ne stigne preko novog stanja.
 */
export function useScoreNews(ready: boolean, scope: string) {
  const [tracked, setTracked] = useState<{ scope: string; queue: NewsQueue }>({
    scope,
    queue: EMPTY_QUEUE,
  });
  const queue = tracked.queue;

  // Pri renderu, kao i `useTableBeat`: bez naslikanog kadra sa starim redom.
  if (tracked.scope !== scope) {
    setTracked({ scope, queue: EMPTY_QUEUE });
  } else if (!queue.current && ready && queue.waiting.length > 0) {
    setTracked({ scope, queue: startNextNews(queue) });
  }

  const enqueue = useCallback((items: readonly ScoreNewsItem[]) => {
    setTracked((t) => ({ ...t, queue: enqueueNews(t.queue, items) }));
  }, []);

  const currentId = queue.current?.id ?? null;
  const ours = queue.current?.kind === "card" && queue.current.ours;
  useEffect(() => {
    if (currentId === null) return;
    if (ours) {
      playSfx("news");
      vibrate(HAPTIC.news);
    }
    const reduced = prefersReducedMotion();
    const still = (t: { queue: NewsQueue }) => t.queue.current?.id === currentId;
    const settle = setTimeout(
      () => setTracked((t) => (still(t) ? { ...t, queue: settleNews(t.queue) } : t)),
      reduced ? NEWS_REDUCED_MS : NEWS_SETTLE_MS,
    );
    const finish = setTimeout(
      () => setTracked((t) => (still(t) ? { ...t, queue: finishNews(t.queue) } : t)),
      reduced ? NEWS_REDUCED_MS : NEWS_MS,
    );
    return () => {
      clearTimeout(settle);
      clearTimeout(finish);
    };
  }, [currentId, ours]);

  return { queue, enqueue };
}
