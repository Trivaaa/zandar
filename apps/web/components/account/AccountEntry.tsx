"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { MethodSheet } from "@/components/account/AccountSheets";

/**
 * Ulaz u nalog sa Profila i Prijatelja: Registruj se → A3, Prijavi se → B2.
 * Hook vraća otvarače i list koji host renderuje.
 */
export function useAccountEntry(): {
  openRegister: () => void;
  openLogin: () => void;
  sheet: ReactNode;
} {
  const router = useRouter();
  const [open, setOpen] = useState<"register" | "login" | null>(null);

  const sheet = open ? (
    <MethodSheet
      kind={open}
      googleAvailable={false}
      onGoogle={() => setOpen(null)}
      onEmail={() => {
        setOpen(null);
        router.push(open === "register" ? "/nalog/registracija" : "/nalog/prijava");
      }}
      onClose={() => setOpen(null)}
    />
  ) : null;

  return { openRegister: () => setOpen("register"), openLogin: () => setOpen("login"), sheet };
}
