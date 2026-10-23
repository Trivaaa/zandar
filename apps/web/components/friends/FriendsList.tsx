"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { FriendsIcon, WarningIcon } from "@/components/icons";
import { InviteSheet } from "@/components/friends/InviteSheet";
import { Avatar } from "@/components/profile/Avatar";
import { usePlayerInfo } from "@/components/profile/PlayerInfo";
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchFriends,
  type FriendEntry,
} from "@/lib/friends";
import { sr } from "@/lib/sr";
import { useFriendRequestCount } from "@/lib/userChannel";

type Load =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; friends: FriendEntry[]; incoming: FriendEntry[] };

function Face({ entry }: { entry: FriendEntry }) {
  return entry.avatar ? (
    <Avatar avatar={entry.avatar} />
  ) : (
    <span className="friends__letter" aria-hidden="true">
      {entry.nickname.charAt(0).toLocaleUpperCase("sr-Latn")}
    </span>
  );
}

/**
 * Tab Prijatelji za nalog (§6.6): D1 prazno, lista (zahtjevi + prijatelji po
 * abecedi), F8 učitavanje, F9 greška, D5 poruka poslije prihvatanja. Lista se
 * osvježi kad korisnički kanal javi novi broj zahtjeva. Bez statusa na mreži.
 */
export function FriendsList() {
  const router = useRouter();
  const requestCount = useFriendRequestCount();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetchFriends().then(
      (data) => setLoad({ status: "ready", ...data }),
      () => setLoad((cur) => (cur.status === "ready" ? cur : { status: "error" })),
    );
  }, []);
  // E2: list poziva; `undefined` = zatvoren, string = dodirnuti prijatelj.
  const [inviting, setInviting] = useState<string | undefined>(undefined);
  // Radnja iz tuđeg profila (npr. Ukloni) mijenja listu iza lista; F5 poziva.
  const info = usePlayerInfo(refresh, (profile) => setInviting(profile.profileId));

  // Prvo učitavanje i svaka promjena broja zahtjeva sa kanala (D4).
  useEffect(refresh, [refresh, requestCount]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function answer(entry: FriendEntry, accept: boolean) {
    setBusyId(entry.profileId);
    try {
      if (accept) {
        await acceptFriendRequest(entry.profileId);
        setToast(sr.friends.accepted(entry.nickname));
      } else {
        await declineFriendRequest(entry.profileId);
      }
      refresh();
    } catch {
      setToast(sr.account.genericError);
    } finally {
      setBusyId(null);
    }
  }

  const header = (
    <div className="friends__head">
      <h1 className="profile__title">{sr.friends.title}</h1>
      {load.status === "ready" && (load.friends.length > 0 || load.incoming.length > 0) ? (
        <button type="button" className="friends__add" onClick={() => router.push("/prijatelji/dodaj")}>
          {sr.friends.add}
        </button>
      ) : null}
    </div>
  );

  if (load.status === "loading") {
    return (
      <div className="profile__col" aria-busy="true" aria-label={sr.friends.loading}>
        {header}
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="skeleton profile__skel-row" />
        ))}
      </div>
    );
  }

  if (load.status === "error") {
    return (
      <div className="profile__col">
        {header}
        <div className="profile__empty" role="alert">
          <span className="profile__empty-icon" aria-hidden="true">
            <WarningIcon className="profile__empty-svg" />
          </span>
          <h2 className="profile__empty-title">{sr.friends.loadError}</h2>
          <p className="profile__empty-body">{sr.friends.loadErrorBody}</p>
          <button
            type="button"
            className="home__cta profile__empty-cta"
            onClick={() => {
              setLoad({ status: "loading" });
              refresh();
            }}
          >
            {sr.profile.retry}
          </button>
        </div>
      </div>
    );
  }

  if (load.friends.length === 0 && load.incoming.length === 0) {
    return (
      <div className="profile__col">
        {header}
        <div className="profile__empty">
          <span className="profile__empty-icon" aria-hidden="true">
            <FriendsIcon className="profile__empty-svg" />
          </span>
          <h2 className="profile__empty-title">{sr.friends.emptyTitle}</h2>
          <p className="profile__empty-body">{sr.friends.emptyBody}</p>
        </div>
        <div className="profile__actions">
          <button type="button" className="home__cta" onClick={() => router.push("/prijatelji/dodaj")}>
            {sr.friends.addFriend}
          </button>
        </div>
      </div>
    );
  }

  const openProfile = (entry: FriendEntry, el: HTMLElement) =>
    info.open({ displayName: entry.nickname, profileId: entry.profileId }, el.getBoundingClientRect());

  return (
    <div className="profile__col">
      {header}
      {load.incoming.length > 0 ? (
        <section className="friends__section" aria-label={sr.friends.requestsTitle(load.incoming.length)}>
          <h2 className="friends__section-title">{sr.friends.requestsTitle(load.incoming.length)}</h2>
          {load.incoming.map((entry) => (
            <div key={entry.profileId} className="friends__row">
              <Face entry={entry} />
              <span className="friends__name">{entry.nickname}</span>
              <button
                type="button"
                className="friends__btn friends__btn--primary"
                disabled={busyId === entry.profileId}
                onClick={() => void answer(entry, true)}
              >
                {sr.friends.accept}
              </button>
              <button
                type="button"
                className="friends__btn"
                disabled={busyId === entry.profileId}
                onClick={() => void answer(entry, false)}
              >
                {sr.friends.decline}
              </button>
            </div>
          ))}
        </section>
      ) : null}
      {load.friends.length > 0 ? (
        <section className="friends__section" aria-label={sr.friends.listTitle(load.friends.length)}>
          <h2 className="friends__section-title">{sr.friends.listTitle(load.friends.length)}</h2>
          {load.friends.map((entry) => (
            <div key={entry.profileId} className="friends__row">
              <button
                type="button"
                className="friends__open"
                onClick={(e) => openProfile(entry, e.currentTarget)}
              >
                <Face entry={entry} />
                <span className="friends__name">{entry.nickname}</span>
              </button>
              <button
                type="button"
                className="friends__btn"
                onClick={() => setInviting(entry.profileId)}
              >
                {sr.invite.open}
              </button>
            </div>
          ))}
        </section>
      ) : null}
      {toast ? (
        <p className="friends__toast" role="status">
          {toast}
        </p>
      ) : null}
      {info.layer}
      {inviting !== undefined ? (
        <InviteSheet preselect={inviting} onClose={() => setInviting(undefined)} />
      ) : null}
    </div>
  );
}
