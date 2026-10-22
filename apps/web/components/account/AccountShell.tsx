"use client";

import type { ReactNode } from "react";

import { ArrowLeftIcon } from "@/components/icons";
import { sr } from "@/lib/sr";

/**
 * Puni ekran forme naloga (G8): Nazad, „Korak N od 3", naslov, sadržaj pri
 * vrhu (iznad tastature), bez donje navigacije. Isti jezik kao `/ime`.
 */
export function AccountShell({
  step,
  title,
  subtitle,
  onBack,
  children,
}: {
  step?: number;
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <main className="screen namestep acct">
      <button type="button" className="namestep__back" onClick={onBack}>
        <ArrowLeftIcon className="namestep__back-icon" />
        <span>{sr.account.back}</span>
      </button>
      <div className="acct__col">
        {step ? <p className="acct__step">{sr.account.step(step)}</p> : null}
        <h1 className="acct__title">{title}</h1>
        {subtitle ? <p className="acct__sub">{subtitle}</p> : null}
        {children}
      </div>
    </main>
  );
}
