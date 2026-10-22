"use client";

import { notFound } from "next/navigation";

import { AvatarScreen } from "@/components/account/AvatarScreen";
import { identityUi } from "@/lib/features";

export default function Page() {
  if (!identityUi) notFound();
  return <AvatarScreen />;
}
