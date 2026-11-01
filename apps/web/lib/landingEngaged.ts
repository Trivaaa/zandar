import { rememberCampaign } from "./campaign";
import { isAnalyticsEnabled, isNonAppPath, track } from "./track";

const KEY = "kartaonica_landing_engaged";
/** Koliko stranica mora biti vidljiva da posjeta važi i bez dodira. */
const VISIBLE_MS = 5_000;

/**
 * `landing_engaged`: čovjek je stvarno vidio stranicu, jednom po guest ID-u.
 *
 * `first_open` se šalje pri pokretanju SDK-a, pa broji i stranicu koju niko nije
 * pogledao. Ovaj događaj čeka prvi dodir ili 5 s vidljivosti; vrijeme u pozadini
 * se ne računa. Oznaka se piše PRIJE slanja: radije događaj manje nego duplikat.
 */
export function armLandingEngaged(): void {
  if (!isAnalyticsEnabled() || typeof window === "undefined") return;
  try {
    if (localStorage.getItem(KEY) || isNonAppPath(window.location.pathname)) return;
    const campaign = rememberCampaign(window.location.search);

    let remaining = VISIBLE_MS;
    let startedAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const stopTimer = () => {
      if (timer === undefined) return;
      clearTimeout(timer);
      timer = undefined;
      remaining -= Date.now() - startedAt;
    };
    const send = (trigger: "visible_5s" | "tap") => {
      stopTimer();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerdown", onTap, true);
      try {
        if (localStorage.getItem(KEY)) return;
        localStorage.setItem(KEY, "sent");
        track("landing_engaged", { trigger, ...campaign });
      } catch {
        // analitika nikad ne smije da obori ekran
      }
    };
    const startTimer = () => {
      startedAt = Date.now();
      timer = setTimeout(() => send("visible_5s"), Math.max(0, remaining));
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (timer === undefined) startTimer();
      } else {
        stopTimer();
      }
    };
    const onTap = () => send("tap");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointerdown", onTap, { capture: true, passive: true });
    onVisibility();
  } catch {
    // localStorage ume da baci (WebView bez site data) — bez događaja, bez pada
  }
}
