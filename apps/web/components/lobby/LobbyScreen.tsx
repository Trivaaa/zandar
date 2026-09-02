"use client";

import { sr } from "@/lib/sr";

/**
 * Minimalni oblik igrača koji lobi čita. Poklapa se 1:1 sa `RoomPlayer` iz
 * `lib/api` — lobi nema `connectionStatus` (partija još ne postoji), pa
 * `PublicPlayer` ovdje ne odgovara.
 */
export type LobbyPlayer = {
  id: string;
  displayName: string;
  seatIndex: number;
  isHost: boolean;
  teamId?: number;
};

export type LobbyScreenProps = {
  roomId: string;
  players: LobbyPlayer[];
  playerCount: number;
  targetScore: number;
  myPlayerId: string;
  isHost: boolean;
  inviteUrl: string;
  copied: boolean;
  onCopyInvite: () => void;
  joinRequests: { id: string; displayName: string }[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  pendingRequestId?: string | undefined;
  fillEmptySeats: boolean;
  onToggleFill: () => void;
  fillPending: boolean;
  canStart: boolean;
  starting: boolean;
  onStart: () => void;
  onBack: () => void;
  className?: string | undefined;
};

/**
 * The waiting room. Presentation only: no routing, no storage, no timers.
 * The invite link is the star of the screen; everything else supports it.
 */
export function LobbyScreen({
  roomId,
  players,
  playerCount,
  targetScore,
  myPlayerId,
  isHost,
  inviteUrl,
  copied,
  onCopyInvite,
  joinRequests,
  onApprove,
  onReject,
  pendingRequestId,
  fillEmptySeats,
  onToggleFill,
  fillPending,
  canStart,
  starting,
  onStart,
  onBack,
  className = "",
}: LobbyScreenProps) {
  const seatsFilled = players.length;
  const seatsNeeded = Math.max(0, playerCount - seatsFilled);

  const sortedPlayers = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
  const takenSeatIndices = new Set(sortedPlayers.map((p) => p.seatIndex));
  const emptySeatIndices: number[] = [];
  for (let i = 0; i < playerCount; i++) {
    if (!takenSeatIndices.has(i)) emptySeatIndices.push(i);
  }

  const teamLetter = (teamId?: number) => (teamId === 0 ? "A" : teamId === 1 ? "B" : undefined);

  return (
    <div className={`screen lobby ${className}`}>
      <header className="lobby__head">
        <h1 className="lobby__title font-display text-2xl">{sr.lobby.title(roomId)}</h1>
        <p className="lobby__meta font-sans text-sm">
          {sr.lobby.meta(seatsFilled, playerCount, targetScore)}
        </p>
      </header>

      <div className="lobby__body">
        <div className="lobby__invite">
          <span className="lobby__invite-label font-sans text-sm">{sr.lobby.invite}</span>
          <div className="lobby__url-row">
            <span className="lobby__url font-sans text-sm">{inviteUrl}</span>
            <button
              type="button"
              className="lobby__copy font-sans text-sm"
              onClick={onCopyInvite}
              data-copied={copied}
            >
              {copied ? sr.lobby.copied : sr.lobby.copy}
            </button>
          </div>
        </div>

        {isHost && joinRequests.length > 0 ? (
          <div className="lobby__requests">
            <span className="lobby__requests-title font-sans text-sm">
              {sr.lobby.requests(joinRequests.length)}
            </span>
            {joinRequests.map((req) => {
              const disabled = pendingRequestId !== undefined && pendingRequestId !== "";
              const isPending = pendingRequestId === req.id;
              return (
                <div key={req.id} className="lobby__request" data-request-id={req.id}>
                  <span className="lobby__request-name font-sans text-base">{req.displayName}</span>
                  <div className="lobby__request-actions">
                    <button
                      type="button"
                      className="lobby__approve font-sans text-sm"
                      onClick={() => onApprove(req.id)}
                      disabled={disabled}
                      data-disabled={disabled}
                      aria-busy={isPending}
                    >
                      {sr.lobby.approve}
                    </button>
                    <button
                      type="button"
                      className="lobby__reject font-sans text-sm"
                      onClick={() => onReject(req.id)}
                      disabled={disabled}
                      data-disabled={disabled}
                      aria-busy={isPending}
                    >
                      {sr.lobby.reject}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="lobby__seats">
          <span className="lobby__seats-label font-sans text-sm">{sr.lobby.players}</span>
          {sortedPlayers.map((player) => {
            const isYou = player.id === myPlayerId;
            const letter = teamLetter(player.teamId);
            return (
              <div
                key={player.id}
                className="lobby__seat"
                data-lobby-seat={player.id}
                data-team={player.teamId ?? ""}
                data-empty="false"
              >
                <span className="lobby__seat-avatar font-display text-base" aria-hidden="true">
                  {player.displayName.slice(0, 1)}
                </span>
                <div className="lobby__seat-body">
                  <span className="lobby__seat-name font-sans text-base">
                    {player.displayName}
                    {isYou ? <span className="lobby__you font-sans text-sm"> {sr.lobby.you}</span> : null}
                  </span>
                  <span className="lobby__seat-meta font-sans text-xs">
                    {player.isHost ? <span className="lobby__host">{sr.lobby.host}</span> : null}
                    {player.isHost && letter ? " · " : null}
                    {letter ? sr.lobby.team(letter) : null}
                    {!player.isHost && !letter ? sr.lobby.seat(player.seatIndex + 1) : null}
                  </span>
                </div>
              </div>
            );
          })}
          {emptySeatIndices.map((index) => (
            <div
              key={`empty-${index}`}
              className="lobby__seat"
              data-lobby-seat={`empty-${index}`}
              data-empty="true"
            >
              <span className="lobby__seat-avatar font-display text-base" aria-hidden="true" />
              <div className="lobby__seat-body">
                <span className="lobby__seat-name font-sans text-base">{sr.lobby.emptySeat}</span>
                <span className="lobby__seat-meta font-sans text-xs">
                  {sr.lobby.seat(index + 1)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="lobby__actions">
          {isHost ? (
            <>
              <div className="lobby__fill">
                <div className="lobby__fill-row">
                  <span className="lobby__fill-label font-sans text-base">
                    {fillEmptySeats ? sr.lobby.fillOn : sr.lobby.fillOff}
                  </span>
                  <button
                    type="button"
                    className="lobby__fill-toggle"
                    onClick={onToggleFill}
                    disabled={fillPending}
                    data-on={fillEmptySeats}
                    data-disabled={fillPending}
                    aria-checked={fillEmptySeats}
                    role="switch"
                    aria-label={fillEmptySeats ? sr.lobby.fillOn : sr.lobby.fillOff}
                  />
                </div>
                <p className="lobby__fill-hint font-sans text-xs">{sr.lobby.fillHint}</p>
              </div>

              <button
                type="button"
                className="lobby__start font-display text-xl"
                onClick={onStart}
                disabled={!canStart || starting}
                data-disabled={!canStart || starting}
              >
                {starting ? sr.lobby.starting : sr.lobby.start}
              </button>

              {!canStart && !starting ? (
                <p className="lobby__need-more font-sans text-sm">
                  {sr.lobby.needMore(seatsNeeded)}
                </p>
              ) : null}
            </>
          ) : (
            <p className="lobby__waiting font-sans text-base">{sr.lobby.waitingHost}</p>
          )}
        </div>

        <button type="button" className="lobby__back font-sans text-base" onClick={onBack}>
          {sr.back}
        </button>
      </div>
    </div>
  );
}
