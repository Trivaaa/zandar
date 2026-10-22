"use client";

import { notFound } from "next/navigation";

import { NicknameScreen } from "@/components/account/NicknameScreen";
import { identityUi } from "@/lib/features";

export default function Page() {
  if (!identityUi) notFound();
  return <NicknameScreen />;
}
