import type { Metadata } from "next";

import { SignupsAdmin } from "@/components/admin/SignupsAdmin";
import { sr } from "@/lib/sr";

/** `page.web.tsx`: ruta postoji samo na webu, u APK ne ulazi. */
export const metadata: Metadata = {
  title: sr.adminSignups.title,
  robots: { index: false, follow: false },
};

export default function AdminSignupsPage() {
  return <SignupsAdmin />;
}
