"use client";

import { useEffect, useState } from "react";

import { currentAccount } from "@/lib/account";
import { getIdToken } from "@/lib/auth";
import { identityUi } from "@/lib/features";
import { getSocket } from "@/lib/socket";

/**
 * Korisnički kanal (SPEC_IDENTITET T2): socket soba naloga, nezavisna od
 * stola. Server na nju šalje broj dolaznih zahtjeva za prijateljstvo (D4) —
 * odmah po pretplati i na svaku promjenu.
 *
 * Gost nema prijatelje, pa se ne pretplaćuje. Pretplata se ponavlja na svako
 * (ponovno) spajanje socketa: server je ne pamti preko prekida veze.
 */
export function useFriendRequestCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!identityUi) return;
    let cancelled = false;
    const socket = getSocket();

    const subscribe = async () => {
      const account = await currentAccount();
      if (cancelled || !account || account.anonymous) return;
      const idToken = await getIdToken();
      if (cancelled || !idToken) return;
      socket.emit("user:subscribe", { idToken });
    };
    const onCount = (payload: { incoming?: unknown }) => {
      if (typeof payload?.incoming === "number") setCount(payload.incoming);
    };

    socket.on("user:friends", onCount);
    socket.on("connect", subscribe);
    if (socket.connected) void subscribe();
    return () => {
      cancelled = true;
      socket.off("user:friends", onCount);
      socket.off("connect", subscribe);
    };
  }, []);

  return count;
}
