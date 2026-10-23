"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/profile/Avatar";
import { Sheet } from "@/components/sheet/Sheet";
import { fetchFriends, type FriendEntry } from "@/lib/friends";
import { createInviteRoom, inviteToRoom } from "@/lib/invites";
import { roomPath } from "@/lib/routes";
import { sr } from "@/lib/sr";

const PREFS_KEY = "zandar:invite";
type Prefs = { playerCount: 2 | 4; targetScore: 11 | 21 };

/** Broj igrača i cilj pamte zadnji izbor (E2). */
function readPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<Prefs>;
    return {
      playerCount: raw.playerCount === 2 ? 2 : 4,
      targetScore: raw.targetScore === 11 ? 11 : 21,
    };
  } catch {
    return { playerCount: 4, targetScore: 21 };
  }
}

function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // pamćenje je udobnost
  }
}

/**
 * E2 „Pozovi na partiju": broj igrača i cilj (samo za novu sobu), prijatelji
 * sa checkboxom (dodirnuti već označen), Pošalji poziv (N). Nova soba → host
 * ide u nju (E3). Iz sobe (`roomId`) samo poziva u postojeću.
 */
export function InviteSheet({
  preselect,
  roomId,
  onClose,
}: {
  preselect?: string | undefined;
  roomId?: string | undefined;
  onClose: () => void;
}) {
  const router = useRouter();
  const [friends, setFriends] = useState<FriendEntry[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(preselect ? [preselect] : []));
  const [prefs, setPrefs] = useState<Prefs>(readPrefs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFriends().then(
      (data) => setFriends(data.friends),
      () => setFriends([]),
    );
  }, []);

  const toggle = (id: string) =>
    setChosen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const choose = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  };

  async function send() {
    setBusy(true);
    setError(null);
    try {
      if (roomId) {
        await inviteToRoom(roomId, [...chosen]);
        onClose();
      } else {
        const id = await createInviteRoom({ profileIds: [...chosen], ...prefs });
        onClose();
        router.push(roomPath(id));
      }
    } catch {
      setError(sr.account.genericError);
      setBusy(false);
    }
  }

  const segment = <T extends number>(value: T, current: T, onPick: () => void) => (
    <button
      key={value}
      type="button"
      className="invite__seg"
      aria-pressed={value === current}
      onClick={onPick}
    >
      {value}
    </button>
  );

  return (
    <Sheet title={sr.invite.title} closeLabel={sr.account.cancel} onClose={onClose}>
      {roomId ? null : (
        <div className="invite__options">
          <span className="invite__label">{sr.invite.options}</span>
          <div className="invite__segs" role="group" aria-label={sr.invite.options}>
            {segment(2, prefs.playerCount, () => choose({ playerCount: 2 }))}
            {segment(4, prefs.playerCount, () => choose({ playerCount: 4 }))}
            <span className="invite__gap" aria-hidden="true" />
            {segment(11, prefs.targetScore, () => choose({ targetScore: 11 }))}
            {segment(21, prefs.targetScore, () => choose({ targetScore: 21 }))}
          </div>
        </div>
      )}
      {friends === null ? (
        <span className="skeleton profile__skel-row" />
      ) : friends.length === 0 ? (
        <p className="sheet__note sheet__note--muted">{sr.invite.noFriends}</p>
      ) : (
        <div className="invite__list">
          {friends.map((f) => (
            <label key={f.profileId} className="friends__row invite__friend">
              <input
                type="checkbox"
                className="invite__check"
                checked={chosen.has(f.profileId)}
                onChange={() => toggle(f.profileId)}
              />
              {f.avatar ? (
                <Avatar avatar={f.avatar} />
              ) : (
                <span className="friends__letter" aria-hidden="true">
                  {f.nickname.charAt(0).toLocaleUpperCase("sr-Latn")}
                </span>
              )}
              <span className="friends__name">{f.nickname}</span>
            </label>
          ))}
        </div>
      )}
      <button
        type="button"
        className="home__cta sheet__btn"
        disabled={chosen.size === 0 || busy}
        aria-busy={busy}
        onClick={() => void send()}
      >
        {sr.invite.send(chosen.size)}
      </button>
      {error ? (
        <p className="acct__error" role="status">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}
