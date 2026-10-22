"use client";

import { notFound } from "next/navigation";

import { LoginEmailScreen } from "@/components/account/LoginEmailScreen";
import { identityUi } from "@/lib/features";

export default function Page() {
  if (!identityUi) notFound();
  return <LoginEmailScreen />;
}
