"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * `/igraj` je bio ekran sa formom prije brze igre. Sad „Igraj Žandar" na
 * početnoj vodi pravo za sto, a izbor se mijenja u Postavkama → Brza igra —
 * stari link (oznaka, istorija pregledača) samo vraća na početnu.
 */
export default function QuickPlaySetupRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
