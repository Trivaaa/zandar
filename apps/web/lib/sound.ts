"use client";

/**
 * Sintetizovani SFX (PRD §50.2) preko Web Audio API-ja — bez audio fajlova.
 *
 * Tonovi/šum + envelope; suptilno (master gain nizak). Poštuje korisničku
 * postavku (`getSound`) i autoplay policy (AudioContext se otključa na prvi
 * korisnički gest). Throttle sprječava kakofoniju kod brzih nizova poteza.
 * Kasnije se lako zamijeni pravim samplovima (ista `playSfx` površina).
 */

import { getSound } from "./settings";

export type SfxName =
  | "place"
  | "capture"
  | "sweep"
  | "turn"
  | "deal"
  | "win"
  | "lose";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22; // suptilno
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// Autoplay policy: otključaj kontekst na prvi gest bilo gdje na stranici.
if (typeof window !== "undefined") {
  const unlock = () => {
    ensureCtx();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

/** Jedan ton sa kratkim attack/decay envelope-om. */
function tone(
  freq: number,
  when: number,
  dur: number,
  type: OscillatorType = "sine",
  peak = 1,
): void {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Kratki filtrirani šum (za "tap"/riffle). */
function noise(when: number, dur: number, peak = 0.4, highpass = 1000): void {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = highpass;
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// Throttle po imenu — spriječi dupli/kakofoničan okidač.
const lastAt: Partial<Record<SfxName, number>> = {};
const MIN_GAP_MS = 70;

function render(name: SfxName): void {
  switch (name) {
    case "place": // spuštanje karte na sto — mek "tap"
      noise(0, 0.05, 0.3, 1400);
      tone(180, 0, 0.05, "sine", 0.25);
      break;
    case "capture": // kupljenje — prijatan uzlazni interval (C5→G5)
      tone(523.25, 0, 0.12, "sine", 0.5);
      tone(783.99, 0.06, 0.16, "sine", 0.4);
      break;
    case "sweep": // J-sweep — uzlazni arpeggio C5-E5-G5-C6
      tone(523.25, 0, 0.1, "triangle", 0.4);
      tone(659.25, 0.05, 0.1, "triangle", 0.4);
      tone(783.99, 0.1, 0.1, "triangle", 0.4);
      tone(1046.5, 0.15, 0.2, "triangle", 0.45);
      break;
    case "turn": // tvoj red — mek zvon (E5)
      tone(659.25, 0, 0.22, "sine", 0.4);
      break;
    case "deal": // dijeljenje — brzi "riffle" tikova
      noise(0, 0.03, 0.25, 1600);
      noise(0.05, 0.03, 0.22, 1600);
      noise(0.1, 0.03, 0.2, 1600);
      noise(0.15, 0.03, 0.18, 1600);
      break;
    case "win": // pobjeda — durski arpeggio
      tone(523.25, 0, 0.14, "sine", 0.45);
      tone(659.25, 0.12, 0.14, "sine", 0.45);
      tone(783.99, 0.24, 0.14, "sine", 0.45);
      tone(1046.5, 0.36, 0.3, "sine", 0.5);
      break;
    case "lose": // poraz — silazni dvotonac
      tone(440, 0, 0.18, "triangle", 0.4);
      tone(349.23, 0.16, 0.3, "triangle", 0.4);
      break;
  }
}

/** Pusti SFX ako korisnik nije isključio zvuk i kontekst je otključan. */
export function playSfx(name: SfxName): void {
  if (!getSound()) return;
  const now = Date.now();
  if (now - (lastAt[name] ?? 0) < MIN_GAP_MS) return;
  lastAt[name] = now;
  const c = ensureCtx();
  if (!c || c.state !== "running") return; // nije otključan (autoplay policy)
  render(name);
}
