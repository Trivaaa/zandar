"use client";

import { useEffect, useRef } from "react";

/**
 * Javi JEDNOM kad je element stvarno viđen — ne kad je montiran.
 *
 * „Viđen" = bar `threshold` elementa u vidnom polju neprekidno `dwellMs`.
 * Prolazak skrolom preko sekcije ne računa se kao prikaz. Granica jednog
 * prikaza je MOUNT: povratak na ekran je nov prikaz, re-render nije.
 *
 * Bez IntersectionObserver-a (stari WebView) ne javlja ništa — izgubljen
 * prikaz je bolji od lažnog.
 */
export function useSeenOnce<T extends Element>(
  onSeen: (() => void) | undefined,
  { threshold = 0.5, dwellMs = 1000 }: { threshold?: number; dwellMs?: number } = {},
) {
  const ref = useRef<T>(null);
  const latest = useRef(onSeen);
  const fired = useRef(false);

  useEffect(() => {
    latest.current = onSeen;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current || typeof IntersectionObserver === "undefined") return;

    let timer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          timer ??= window.setTimeout(() => {
            fired.current = true;
            observer.disconnect();
            latest.current?.();
          }, dwellMs);
        } else if (timer !== undefined) {
          window.clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [threshold, dwellMs]);

  return ref;
}
