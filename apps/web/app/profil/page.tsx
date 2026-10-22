"use client";

import { notFound } from "next/navigation";

import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { identityUi } from "@/lib/features";

export default function ProfilePage() {
  if (!identityUi) notFound();
  // Registracija i prijava stižu u koraku 5 (SPEC_IDENTITET tok a i b).
  return <ProfileScreen onRegister={() => {}} onLogin={() => {}} />;
}
