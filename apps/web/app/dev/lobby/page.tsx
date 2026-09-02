"use client";

import { useState } from "react";
import { CreateRoomScreen } from "@/components/lobby/CreateRoomScreen";
import {
  LobbyScreen,
  type LobbyPlayer,
} from "@/components/lobby/LobbyScreen";
import {
  JoinRequestScreen,
  type JoinRequestPhase,
} from "@/components/lobby/JoinRequestScreen";

/**
 * Dev preview za lobi sloj (Lovable korak 6). Komponente su čiste — stanja se
 * biraju ručno. Sedam faza zahtjeva za ulazak se uživo ne mogu lako izazvati
 * (`expired` traži dva minuta čekanja), pa su ovdje sve na preklopci.
 */

const ROSTER: LobbyPlayer[] = [
  { id: "me", displayName: "Igor", seatIndex: 0, isHost: true, teamId: 0 },
  { id: "p1", displayName: "Milica", seatIndex: 1, isHost: false, teamId: 1 },
  { id: "p2", displayName: "Svjetlana Vukašinović", seatIndex: 2, isHost: false, teamId: 0 },
];

const REQUESTS = [
  { id: "r1", displayName: "Zoran" },
  { id: "r2", displayName: "Konstantin Milovanović" },
];

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-token-md px-2.5 py-1 text-sm ${
        on ? "bg-accent text-accent-contrast font-bold" : "bg-surface-raised text-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[360px] h-[800px] max-w-full overflow-y-auto rounded-token-lg ring-1 ring-white/10">
      {children}
    </div>
  );
}

const PHASES: JoinRequestPhase[] = [
  "form",
  "sending",
  "pending",
  "approved",
  "rejected",
  "expired",
  "error",
];

export default function DevLobbyPage() {
  const [name, setName] = useState("");
  const [count, setCount] = useState<2 | 3 | 4>(4);
  const [target, setTarget] = useState(21);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);

  const [seats, setSeats] = useState(3);
  const [isHost, setIsHost] = useState(true);
  const [withRequests, setWithRequests] = useState(true);
  const [fill, setFill] = useState(false);
  const [canStart, setCanStart] = useState(false);
  const [copied, setCopied] = useState(false);

  const [phase, setPhase] = useState<JoinRequestPhase>("pending");

  const players = ROSTER.slice(0, Math.min(seats, ROSTER.length));

  return (
    <div className="min-h-dvh bg-surface p-4 space-y-8 text-white">
      <h1 className="text-xl font-bold">Lobi sloj — port (Lovable korak 6)</h1>

      <section className="space-y-3">
        <h2 className="font-bold">CreateRoomScreen</h2>
        <div className="flex flex-wrap gap-2">
          <Toggle on={creating} onClick={() => setCreating((v) => !v)}>loading</Toggle>
          <Toggle on={createError} onClick={() => setCreateError((v) => !v)}>greška</Toggle>
        </div>
        <Frame>
          <CreateRoomScreen
            displayName={name}
            onDisplayName={setName}
            playerCount={count}
            onPlayerCount={setCount}
            targetScore={target}
            onTargetScore={setTarget}
            onCreate={() => undefined}
            onBack={() => undefined}
            loading={creating}
            {...(createError ? { error: "Soba ne može da se kreira. Pokušaj ponovo." } : {})}
          />
        </Frame>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">LobbyScreen</h2>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((n) => (
            <Toggle key={n} on={seats === n} onClick={() => setSeats(n)}>
              {n} u sobi
            </Toggle>
          ))}
          <Toggle on={isHost} onClick={() => setIsHost((v) => !v)}>host</Toggle>
          <Toggle on={withRequests} onClick={() => setWithRequests((v) => !v)}>zahtjevi</Toggle>
          <Toggle on={fill} onClick={() => setFill((v) => !v)}>popuni mjesta</Toggle>
          <Toggle on={canStart} onClick={() => setCanStart((v) => !v)}>može start</Toggle>
          <Toggle on={copied} onClick={() => setCopied((v) => !v)}>kopirano</Toggle>
        </div>
        <Frame>
          <LobbyScreen
            roomId="a1b2c3"
            players={players}
            playerCount={4}
            targetScore={21}
            myPlayerId="me"
            isHost={isHost}
            inviteUrl="https://kartaonica.com/room/a1b2c3"
            copied={copied}
            onCopyInvite={() => setCopied(true)}
            joinRequests={isHost && withRequests ? REQUESTS : []}
            onApprove={() => undefined}
            onReject={() => undefined}
            fillEmptySeats={fill}
            onToggleFill={() => setFill((v) => !v)}
            fillPending={false}
            canStart={canStart}
            starting={false}
            onStart={() => undefined}
            onBack={() => undefined}
          />
        </Frame>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">JoinRequestScreen</h2>
        <div className="flex flex-wrap gap-2">
          {PHASES.map((p) => (
            <Toggle key={p} on={phase === p} onClick={() => setPhase(p)}>
              {p}
            </Toggle>
          ))}
        </div>
        <Frame>
          <JoinRequestScreen
            roomId="a1b2c3"
            playersJoined={2}
            playerCount={4}
            targetScore={21}
            phase={phase}
            displayName={name}
            onDisplayName={setName}
            onSubmit={() => undefined}
            remainingMs={72_000}
            {...(phase === "error"
              ? { message: "Soba je puna. Pokušaj kasnije." }
              : {})}
            onBack={() => undefined}
          />
        </Frame>
      </section>
    </div>
  );
}
