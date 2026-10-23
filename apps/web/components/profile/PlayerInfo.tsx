"use client";

import { useState, type ReactNode } from "react";

import { GuestCard } from "@/components/profile/GuestCard";
import { OtherProfileSheet } from "@/components/profile/OtherProfileSheet";
import { Sheet } from "@/components/sheet/Sheet";
import { currentAccount } from "@/lib/account";
import {
  REPORT_REASONS,
  reportPlayer,
  setBlocked,
  type PublicProfile,
  type ReportReason,
} from "@/lib/profile";
import { sr } from "@/lib/sr";

type Tapped = { name: string; profileId: string | null; anchor: DOMRect };

/** Korak u listovima tuđeg profila (§6.5, §6.9). */
type Step =
  | { kind: "profile" }
  | { kind: "menu"; profile: PublicProfile; viewerIsGuest: boolean }
  | { kind: "block"; profile: PublicProfile }
  | { kind: "report"; profile: PublicProfile }
  | { kind: "thanks" };

/**
 * Dodir na igrača za stolom ili u sobi (T1–T3): nalog → tuđi profil (list),
 * svako bez naloga → mali oblačić sa slovom i nadimkom. Odluka je SAMO po
 * `profileId` — gost i bot su `null` i izgledaju isto (G3, HARD RULE 3).
 *
 * Iz profila: Blokiraj ili prijavi (§6.9). Blokira samo nalog (blokada štiti
 * od zahtjeva i poziva); prijaviti može i gost (uvredljiv nadimak vidi i on).
 */
export function usePlayerInfo(): {
  open: (player: { displayName: string; profileId?: string | null }, anchor: DOMRect) => void;
  layer: ReactNode;
} {
  const [tapped, setTapped] = useState<Tapped | null>(null);
  const [step, setStep] = useState<Step>({ kind: "profile" });
  // Ponovno učitavanje profila poslije (od)blokiranja — odnos se promijenio.
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);

  const close = () => {
    setTapped(null);
    setStep({ kind: "profile" });
    setError(null);
    setReason(null);
  };
  const back = () => {
    setStep({ kind: "profile" });
    setError(null);
  };

  async function run(action: () => Promise<void>, next: Step) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setVersion((v) => v + 1);
      setStep(next);
    } catch {
      setError(sr.account.genericError);
    } finally {
      setBusy(false);
    }
  }

  const errorLine = error ? (
    <p className="acct__error" role="status">
      {error}
    </p>
  ) : null;

  let layer: ReactNode = null;
  if (tapped && !tapped.profileId) {
    layer = <GuestCard name={tapped.name} anchor={tapped.anchor} onClose={close} />;
  } else if (tapped?.profileId && step.kind === "profile") {
    const profileId = tapped.profileId;
    layer = (
      <OtherProfileSheet
        key={`${profileId}:${version}`}
        profileId={profileId}
        onClose={close}
        actions={(profile) =>
          profile.relation === "blocked" ? (
            <>
              <p className="other-profile__relation">{sr.otherProfile.blocked}</p>
              <button
                type="button"
                className="home__friends sheet__btn"
                disabled={busy}
                onClick={() => void run(() => setBlocked(profileId, false), { kind: "profile" })}
              >
                {sr.otherProfile.unblock}
              </button>
              {errorLine}
            </>
          ) : (
            <button
              type="button"
              className="profile__link"
              onClick={() =>
                void currentAccount().then((a) =>
                  setStep({ kind: "menu", profile, viewerIsGuest: a?.anonymous ?? true }),
                )
              }
            >
              {sr.otherProfile.blockOrReport}
            </button>
          )
        }
      />
    );
  } else if (step.kind === "menu") {
    layer = (
      <Sheet title={step.profile.nickname} closeLabel={sr.account.cancel} onClose={back}>
        {step.viewerIsGuest ? null : (
          <button
            type="button"
            className="home__friends sheet__btn"
            onClick={() => setStep({ kind: "block", profile: step.profile })}
          >
            {sr.otherProfile.block}
          </button>
        )}
        <button
          type="button"
          className="home__friends sheet__btn"
          onClick={() => setStep({ kind: "report", profile: step.profile })}
        >
          {sr.otherProfile.report}
        </button>
      </Sheet>
    );
  } else if (step.kind === "block") {
    const { profile } = step;
    layer = (
      <Sheet title={sr.otherProfile.blockConfirm(profile.nickname)} closeLabel={sr.account.cancel} onClose={back}>
        <p className="sheet__note">{sr.otherProfile.blockBody}</p>
        <button
          type="button"
          className="acct__danger sheet__btn"
          disabled={busy}
          aria-busy={busy}
          onClick={() => void run(() => setBlocked(profile.profileId, true), { kind: "profile" })}
        >
          {sr.otherProfile.block}
        </button>
        {errorLine}
      </Sheet>
    );
  } else if (step.kind === "report") {
    const { profile } = step;
    layer = (
      <Sheet title={sr.otherProfile.reportTitle(profile.nickname)} closeLabel={sr.account.cancel} onClose={back}>
        <div className="report__reasons" role="radiogroup" aria-label={sr.otherProfile.reportTitle(profile.nickname)}>
          {REPORT_REASONS.map((r) => (
            <label key={r} className="acct__check report__reason">
              <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} />
              <span>{sr.otherProfile.reasons[r]}</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          className="home__cta sheet__btn"
          disabled={!reason || busy}
          aria-busy={busy}
          onClick={() => reason && void run(() => reportPlayer(profile.profileId, reason), { kind: "thanks" })}
        >
          {sr.otherProfile.sendReport}
        </button>
        {errorLine}
      </Sheet>
    );
  } else if (step.kind === "thanks") {
    layer = (
      <Sheet title={sr.otherProfile.reportThanks} closeLabel={sr.otherProfile.close} onClose={close}>
        {null}
      </Sheet>
    );
  }

  return {
    open: (player, anchor) => {
      setStep({ kind: "profile" });
      setTapped({ name: player.displayName, profileId: player.profileId ?? null, anchor });
    },
    layer,
  };
}
