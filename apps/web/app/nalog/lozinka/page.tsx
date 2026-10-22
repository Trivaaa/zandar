"use client";

import { notFound } from "next/navigation";

import { ResetPasswordScreen } from "@/components/account/ResetPasswordScreen";
import { identityUi } from "@/lib/features";

export default function Page() {
  if (!identityUi) notFound();
  return <ResetPasswordScreen />;
}
