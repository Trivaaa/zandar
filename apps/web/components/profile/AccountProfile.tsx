"use client";

import { WarningIcon } from "@/components/icons";
import { sr } from "@/lib/sr";

/**
 * P8 — profil naloga se nije učitao. Ostatak Profila (A1/A2) je u
 * `ProfileScreen` + `ProfileParts`; ovo stoji ispod naslova i pilule.
 */
export function AccountProfileError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="profile__empty" role="alert">
      <span className="profile__empty-icon" aria-hidden="true">
        <WarningIcon className="profile__empty-svg" />
      </span>
      <h2 className="profile__empty-title">{sr.profile.loadError}</h2>
      <p className="profile__empty-body">{sr.profile.loadErrorBody}</p>
      <button type="button" className="home__cta profile__empty-cta" onClick={onRetry}>
        {sr.profile.retry}
      </button>
    </div>
  );
}
