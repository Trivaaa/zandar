"use client";

import { notFound } from "next/navigation";

import { NicknameScreen } from "@/components/account/NicknameScreen";
import { identityUi } from "@/lib/features";

/** P5 — promjena nadimka (jednom u 30 dana). */
export default function Page() {
  if (!identityUi) notFound();
  return <NicknameScreen mode="change" />;
}
