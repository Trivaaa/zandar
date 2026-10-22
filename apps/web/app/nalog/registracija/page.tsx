"use client";

import { notFound } from "next/navigation";

import { RegisterEmailScreen } from "@/components/account/RegisterEmailScreen";
import { identityUi } from "@/lib/features";

export default function Page() {
  if (!identityUi) notFound();
  return <RegisterEmailScreen />;
}
