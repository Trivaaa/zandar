"use client";

import { io, type Socket } from "socket.io-client";
import { getGuestId } from "@/lib/guestId";
import { resolveApiBase } from "@/lib/platform";

const SOCKET_URL = resolveApiBase();

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { guestId: getGuestId() },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}