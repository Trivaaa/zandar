"use client";

import { notFound } from "next/navigation";

import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { identityUi } from "@/lib/features";

export default function ProfilePage() {
  if (!identityUi) notFound();
  return <ProfileScreen />;
}
