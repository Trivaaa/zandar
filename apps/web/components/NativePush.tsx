"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  capturePush,
  pushEnabled,
  pushPermission,
  registerForPush,
  TABLE_CHANNEL_ID,
} from "@/lib/push";
import { roomPath } from "@/lib/routes";
import { sr } from "@/lib/sr";

const ROOM_ID = /^[a-z0-9]{1,32}$/i;

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

      const handle = await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        ({ notification }) => {
          const data = notification.data as { type?: unknown; roomId?: unknown } | undefined;
          capturePush("push_opened", {
            type: typeof data?.type === "string" ? data.type : "unknown",
          });
          const roomId = data?.roomId;
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
    })().catch(() => {});

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router]);

  return null;
}
