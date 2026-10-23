"use client";

import { notFound } from "next/navigation";

import { AddFriendScreen } from "@/components/friends/AddFriendScreen";
import { identityUi } from "@/lib/features";

/** D2 — Dodaj prijatelja (puni ekran, bez donje navigacije). */
export default function Page() {
  if (!identityUi) notFound();
  return <AddFriendScreen />;
}
