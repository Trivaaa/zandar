"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { acceptInvite } from "@/lib/invites";
import {
  capturePush,
  capturePushState,
  FRIENDS_CHANNEL_ID,
  HOME_GAME_PARAM,
  pushEnabled,
  pushPermission,
  pushRegistrationPending,
  registerForPush,
  REMINDERS_CHANNEL_ID,
  TABLE_CHANNEL_ID,
} from "@/lib/push";
import { withQuery } from "@/lib/useQuery";
import { ROOM_ID, roomPath } from "@/lib/routes";
import { sr } from "@/lib/sr";
import { dismissInvite, markInviteExpired } from "@/lib/userChannel";

/**
 * Push u native shell-u (PRD §51): kanal, osvježen token i tap → soba.
 *
 * Zaseban od `NativeShell`-a — hardversko "nazad" i obavještenja nemaju
 * zajedničko stanje, a `NativeShell` se gradi i bez Firebase-a.
 *
 * Tap koji je POKRENUO aplikaciju: plugin čuva
 * `pushNotificationActionPerformed` dok se prvi listener ne prijavi, pa stiže i
 * ovdje, poslije hidracije.
 *
 * Notifikacija dok je aplikacija u prvom planu: Android je ne crta u traci
 * (plugin samo emituje `pushNotificationReceived`), a ekran već pokazuje isto —
 * zato na nju nema listenera.
 */
export function NativePush() {
  const router = useRouter();

  useEffect(() => {
    if (!pushEnabled) return;

    let cancelled = false;
    let remove: (() => void) | undefined;

    void (async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      // Kanal PRIJE prve poruke: nepoznat `channel_id` pada na podrazumijevani
      // kanal, koji nema heads-up prikaz — "neko kuca" bi stiglo tiho.
      await PushNotifications.createChannel({
        id: TABLE_CHANNEL_ID,
        name: sr.push.channelName,
        description: sr.push.channelDescription,
        importance: 4,
        visibility: 1,
        vibration: true,
      }).catch(() => {});
      // Zaseban kanal, da se zahtjevi mogu isključiti nezavisno od stola (§8).
      await PushNotifications.createChannel({
        id: FRIENDS_CHANNEL_ID,
        name: sr.push.friendsChannelName,
        description: sr.push.friendsChannelDescription,
        importance: 3,
        visibility: 1,
        vibration: true,
      }).catch(() => {});
      // Podsjetnici (SPEC_PUSH_V2 B1): bez iskakanja preko ekrana, gase se
      // nezavisno od stola i prijatelja. Kanal MORA postojati prije prve poruke.
      await PushNotifications.createChannel({
        id: REMINDERS_CHANNEL_ID,
        name: sr.push.remindersChannelName,
        description: sr.push.remindersChannelDescription,
        importance: 3,
        visibility: 1,
        vibration: false,
      }).catch(() => {});

      const handle = await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        ({ notification }) => {
          const data = notification.data as
            | { type?: unknown; roomId?: unknown; step?: unknown; reason?: unknown; game?: unknown }
            | undefined;
          const str = (v: unknown) => (typeof v === "string" ? v : undefined);
          capturePush("push_opened", {
            type: str(data?.type) ?? "unknown",
            ...(data?.type === "reminder"
              ? { step: str(data.step), reason: str(data.reason), game: str(data.game) }
              : {}),
          });
          // SPEC_PUSH_V2 B6: podsjetnik → početna sa svojom igrom na vrhu; partija ne kreće sama.
          if (data?.type === "reminder") {
            router.push(withQuery("/", { [HOME_GAME_PARAM]: str(data.game) }));
            return;
          }
          const roomId = data?.roomId;
          // §8: zahtjev → tab Prijatelji (sekcija zahtjeva je na vrhu).
          if (data?.type === "friend_request") {
            router.push("/prijatelji");
            return;
          }
          // §8: poziv → pravo u sobu, kao Pridruži se; istekao → F7 na početnoj.
          if (data?.type === "invite" && typeof roomId === "string" && ROOM_ID.test(roomId)) {
            void acceptInvite(roomId).then((result) => {
              if (result === "ok") {
                dismissInvite(roomId);
                router.push(roomPath(roomId));
              } else {
                markInviteExpired();
                router.push("/");
              }
            });
            return;
          }
          if (typeof roomId === "string" && ROOM_ID.test(roomId)) {
            router.push(roomPath(roomId));
          }
        },
      );
      if (cancelled) {
        void handle.remove();
        return;
      }
      remove = () => void handle.remove();

      // Svaki start osvježava token. Bez date dozvole se ništa ne pita —
      // to radi samo `PushPrompt`, u trenutku kad igrač nešto čeka.
      if ((await pushPermission()) === "granted") void registerForPush();
      // Doseg (SPEC_PUSH_V2 A5): stanje dozvole i preklopki, jednom po pokretanju.
      void capturePushState();
    })().catch(() => {});

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router]);

  // Samopopravka: prvi pokušaj registracije ume da otkaže na hladnom startu
  // Play Services-a (izmjereno na uređaju — poslije restarta telefona zna
  // trajati duže od tadašnjeg roka). Umjesto da čeka sljedeće pokretanje
  // aplikacije, svaki povratak u prvi plan dok server u OVOM pokretanju nije
  // potvrdio uređaj (dozvola već odobrena) tiho pokuša ponovo. Sačuvan
  // `pushId` nije dokaz: ostaje u localStorage-u i kad start-registracija
  // otkaže, pa bi uslov "nema pushId-a" preskočio baš taj slučaj — `registerForPush()` je idempotentan
  // (`inFlight` dedup), pa dupli pokušaj nije opasan.
  useEffect(() => {
    if (!pushEnabled) return;

    function retryIfMissing() {
      if (document.visibilityState !== "visible" || !pushRegistrationPending()) return;
      void pushPermission().then((permission) => {
        if (permission === "granted") void registerForPush();
      });
    }

    document.addEventListener("visibilitychange", retryIfMissing);
    window.addEventListener("focus", retryIfMissing);
    return () => {
      document.removeEventListener("visibilitychange", retryIfMissing);
      window.removeEventListener("focus", retryIfMissing);
    };
  }, []);

  return null;
}
