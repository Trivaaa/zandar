"use client";

import { useState, type ReactNode } from "react";

import { GuestCard } from "@/components/profile/GuestCard";
import { OtherProfileSheet } from "@/components/profile/OtherProfileSheet";
import { Sheet } from "@/components/sheet/Sheet";
import { currentAccount } from "@/lib/account";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "@/lib/friends";
import {
  REPORT_REASONS,
  reportPlayer,
  setBlocked,
  type PublicProfile,
  type ReportReason,
} from "@/lib/profile";
import { sr } from "@/lib/sr";

type Tapped = { name: string; profileId: string | null; anchor: DOMRect; viewerIsGuest: boolean };

/** Korak u listovima tuđeg profila (§6.5, §6.9). */
type Step =
  | { kind: "profile" }
  | { kind: "menu"; profile: PublicProfile }
  | { kind: "block"; profile: PublicProfile }
  | { kind: "report"; profile: PublicProfile }
  | { kind: "remove"; profile: PublicProfile }
  | { kind: "thanks" };

/**
 * Dodir na igrača (za stolom, u sobi, u listi prijatelja): nalog → tuđi
 * profil sa radnjama prema odnosu (F2–F6); svako bez naloga → mali oblačić
 * (T3). Odluka je SAMO po `profileId` — gost i bot su `null` i izgledaju isto.
 *
 * Gost koji gleda profil nema radnje prijateljstva (prijatelji su za
 * naloge) ni blokadu — samo prijavu (§6.9, uvredljiv nadimak vidi i on).
 */
export function usePlayerInfo(
  onChanged?: () => void,
  /** F5 „Pozovi na partiju" — samo gdje host može da pozove (lista prijatelja). */
  onInvite?: (profile: PublicProfile) => void,
): {
  open: (player: { displayName: string; profileId?: string | null }, anchor: DOMRect) => void;
  layer: ReactNode;
} {
  const [tapped, setTapped] = useState<Tapped | null>(null);
  const [step, setStep] = useState<Step>({ kind: "profile" });
  // Ponovno učitavanje profila poslije svake radnje — odnos se promijenio.
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

  async function run(action: () => Promise<unknown>, next: Step = { kind: "profile" }) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setVersion((v) => v + 1);
      // Npr. lista prijatelja iza lista — odnos se promijenio.
      onChanged?.();
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

  /** F2–F5: glavna i sporedna radnja prema odnosu, pa „Blokiraj ili prijavi". */
  function actionsFor(profile: PublicProfile, viewerIsGuest: boolean): ReactNode {
    const id = profile.profileId;
    const primary = (label: string, onClick: () => void, disabled = false) => (
      <button type="button" className="home__cta sheet__btn" disabled={busy || disabled} onClick={onClick}>
        {label}
      </button>
    );
    const secondary = (label: string, onClick: () => void) => (
      <button type="button" className="profile__link" disabled={busy} onClick={onClick}>
        {label}
      </button>
    );
    const menu = secondary(
      viewerIsGuest ? sr.otherProfile.report : sr.otherProfile.blockOrReport,
      () => setStep(viewerIsGuest ? { kind: "report", profile } : { kind: "menu", profile }),
    );

    if (profile.relation === "blocked") {
      return (
        <>
          <p className="other-profile__relation">{sr.otherProfile.blocked}</p>
          {primary(sr.otherProfile.unblock, () => void run(() => setBlocked(id, false)))}
          {errorLine}
        </>
      );
    }
    if (viewerIsGuest) return menu;

    let body: ReactNode;
    switch (profile.relation) {
      case "outgoing":
        body = (
          <>
            {primary(sr.otherProfile.requestSent, () => {}, true)}
            {secondary(sr.otherProfile.withdraw, () => void run(() => cancelFriendRequest(id)))}
          </>
        );
        break;
      case "incoming":
        body = (
          <>
            <p className="other-profile__relation">{sr.otherProfile.wantsFriend}</p>
            {primary(sr.otherProfile.acceptRequest, () => void run(() => acceptFriendRequest(id)))}
            {secondary(sr.otherProfile.decline, () => void run(() => declineFriendRequest(id)))}
          </>
        );
        break;
      case "friends":
        body = (
          <>
            <p className="other-profile__relation">{sr.otherProfile.areFriends}</p>
            {onInvite
              ? primary(sr.otherProfile.inviteToGame, () => {
                  close();
                  onInvite(profile);
                })
              : null}
            {secondary(sr.otherProfile.removeFriend, () => setStep({ kind: "remove", profile }))}
          </>
        );
        break;
      default:
        body = primary(sr.otherProfile.addFriend, () => void run(() => sendFriendRequest(id)));
    }
    return (
      <>
        {body}
        {menu}
        {errorLine}
      </>
    );
  }

  let layer: ReactNode = null;
  if (tapped && !tapped.profileId) {
    layer = <GuestCard name={tapped.name} anchor={tapped.anchor} onClose={close} />;
  } else if (tapped?.profileId && step.kind === "profile") {
    const viewerIsGuest = tapped.viewerIsGuest;
    layer = (
      <OtherProfileSheet
        key={`${tapped.profileId}:${version}`}
        profileId={tapped.profileId}
        onClose={close}
        actions={(profile) => actionsFor(profile, viewerIsGuest)}
      />
    );
  } else if (step.kind === "menu") {
    layer = (
      <Sheet title={step.profile.nickname} closeLabel={sr.account.cancel} onClose={back}>
        <button
          type="button"
          className="home__friends sheet__btn"
          onClick={() => setStep({ kind: "block", profile: step.profile })}
        >
          {sr.otherProfile.block}
        </button>
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
          onClick={() => void run(() => setBlocked(profile.profileId, true))}
        >
          {sr.otherProfile.block}
        </button>
        {errorLine}
      </Sheet>
    );
  } else if (step.kind === "remove") {
    // F6 — tiho: drugi igrač ne dobija obavještenje.
    const { profile } = step;
    layer = (
      <Sheet title={sr.otherProfile.removeConfirm(profile.nickname)} closeLabel={sr.account.cancel} onClose={back}>
        <p className="sheet__note">{sr.otherProfile.removeBody}</p>
        <button
          type="button"
          className="home__cta sheet__btn"
          disabled={busy}
          aria-busy={busy}
          onClick={() => void run(() => removeFriend(profile.profileId))}
        >
          {sr.otherProfile.remove}
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
      const profileId = player.profileId ?? null;
      // Ko gleda (gost ili nalog) određuje radnje — lokalno, bez servera.
      void currentAccount().then((a) =>
        setTapped({ name: player.displayName, profileId, anchor, viewerIsGuest: a?.anonymous ?? true }),
      );
    },
    layer,
  };
}
