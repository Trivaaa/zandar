"use client";

import { notFound } from "next/navigation";

import { DeleteAccountScreen } from "@/components/account/DeleteAccountScreen";
import { identityUi } from "@/lib/features";

/** Tok c — brisanje naloga (C2–C6). */
export default function Page() {
  if (!identityUi) notFound();
  return <DeleteAccountScreen />;
}
