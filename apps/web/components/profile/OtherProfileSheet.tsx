"use client";

import { useEffect, useState, type ReactNode } from "react";

import { RetryIcon, WarningIcon } from "@/components/icons";
import { Avatar } from "@/components/profile/Avatar";
import { Sheet } from "@/components/sheet/Sheet";
import { fetchPublicProfile, type PublicProfile } from "@/lib/profile";
import { sr } from "@/lib/sr";

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; profile: PublicProfile };

/**
 * Tuđi profil (T1 za stolom, T2 u sobi; T4 učitavanje, T5 greška). Samo
 * javno lice: avatar, nadimak, broj partija — nikad e-mail ni način prijave.
 * List ima istu visinu u svim stanjima, da ne skače.
 *
 * `actions` puni host prema odnosu (F2–F5); prazno mjesto ostaje rezervisano.
 */
export function OtherProfileSheet({
  profileId,
  onClose,
  actions,
}: {
  profileId: string;
  onClose: () => void;
  actions?: (profile: PublicProfile) => ReactNode;
}) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPublicProfile(profileId).then(
      (profile) => !cancelled && setLoad({ status: "ready", profile }),
      () => !cancelled && setLoad({ status: "error" }),
    );
    return () => {
      cancelled = true;
    };
  }, [profileId, attempt]);

  return (
    <Sheet title={sr.otherProfile.title} closeLabel={sr.otherProfile.close} onClose={onClose}>
      <div className="other-profile">
        {load.status === "ready" ? (
          <>
            {load.profile.avatar ? (
              <Avatar avatar={load.profile.avatar} className="avatar--xl" />
            ) : (
              <span className="profile__letter profile__letter--xl" aria-hidden="true">
                {load.profile.nickname.charAt(0).toLocaleUpperCase("sr-Latn")}
              </span>
            )}
            <span className="profile__hero-name">{load.profile.nickname}</span>
            <span className="profile__meta">{sr.profile.completed(load.profile.completedMatches)}</span>
            <div className="other-profile__actions">
              {load.profile.relation === "self" ? null : actions?.(load.profile)}
            </div>
          </>
        ) : load.status === "loading" ? (
          <div className="other-profile__state" aria-busy="true" aria-label={sr.profile.loading}>
            <span className="skeleton profile__skel-avatar" />
            <span className="skeleton profile__skel-name" />
            <span className="skeleton profile__skel-meta" />
          </div>
        ) : (
          <div className="other-profile__state" role="alert">
            <WarningIcon className="profile__empty-svg" />
            <p className="profile__empty-title">{sr.otherProfile.loadError}</p>
            <button
              type="button"
              className="profile__retry"
              onClick={() => {
                setLoad({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              <RetryIcon className="profile__retry-icon" />
              {sr.profile.retry}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
