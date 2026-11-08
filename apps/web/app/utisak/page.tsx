"use client";

import { useRouter } from "next/navigation";

import { FeedbackForm } from "@/components/feedback/FeedbackForm";

/**
 * `/utisak` — „Pošalji utisak" (tabla A2). Otvara se sa početne („Greška ili
 * ideja? Piši nam") i iz Postavki.
 *
 * Zasebna ruta, a ne sheet, iz istog razloga kao `/ime`: Android „nazad" na `/`
 * gasi aplikaciju, a ovdje radi `router.back()`. Ruta je statička, pa prolazi
 * i APK export.
 */
export default function FeedbackPage() {
  const router = useRouter();

  function leave() {
    // Direktno otvoren `/utisak` nema gdje „nazad" — tad je odredište početna.
    if (window.history.length > 1) router.back();
    else router.replace("/");
  }

  return <FeedbackForm onBack={leave} onDone={() => router.replace("/")} />;
}
