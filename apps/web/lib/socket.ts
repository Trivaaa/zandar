"use client";

import { io, type Socket } from "socket.io-client";
import { CLIENT_GAMES } from "@/lib/clientGames";
import { getGuestId } from "@/lib/guestId";
import { resolveApiBase } from "@/lib/platform";

const SOCKET_URL = resolveApiBase();

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // `games`: bez njega server odbija pretplatu na poker sobu (UPDATE_REQUIRED).
      auth: { guestId: getGuestId(), games: CLIENT_GAMES },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}