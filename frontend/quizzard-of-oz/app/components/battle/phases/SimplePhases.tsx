'use client';

/**
 * ConnectingPhase Component
 *
 * Initial phase shown while establishing WebSocket connection to battle server.
 * Displays a rotating spinner with a loading message.
 *
 * Duration: Until `match_ready` message is received from server.
 */
export function ConnectingPhase() {
  return (
    <div className="flex flex-col items-center gap-5 reveal">
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(255,60,20,0.12)',
          borderTop: '3px solid rgba(255,60,20,0.85)',
          borderRadius: '50%',
          animation: 'spinSlow 0.9s linear infinite',
        }}
      />
      <div style={{ color: 'rgba(140,200,230,0.5)', fontSize: '0.88rem', letterSpacing: '0.08em' }}>
        Verbinde mit Battle...
      </div>
    </div>
  );
}

/**
 * WaitingForOpponentPhase Component
 *
 * Shown after successful connection, waiting for a second player to join.
 * Displays a rotating spinner and "Warte auf Gegner" message.
 *
 * Duration: Until `match_ready` message is received (second player joins).
 */
export function WaitingForOpponentPhase() {
  return (
    <div className="flex flex-col items-center gap-5 reveal">
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(255,60,20,0.12)',
          borderTop: '3px solid rgba(255,60,20,0.85)',
          borderRadius: '50%',
          animation: 'spinSlow 0.9s linear infinite',
        }}
      />
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.6rem',
          letterSpacing: '0.12em',
          color: 'rgba(160,215,240,0.8)',
        }}
      >
        Warte auf Gegner
      </div>
    </div>
  );
}

/**
 * CategoryChosenPhase Component
 *
 * Shows the category that was just selected by the picker.
 * Displays large category name with a brief "Bereite dich vor..." message.
 *
 * Duration: ~1-2 seconds before first question appears.
 */
interface CategoryChosenPhaseProps {
  readonly category: string;
}

export function CategoryChosenPhase({ category }: CategoryChosenPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-4 pop-in">
      <div style={{ color: 'rgba(255,60,20,0.65)', fontSize: '0.65rem', letterSpacing: '0.25em' }}>
        KATEGORIE
      </div>
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '3.5rem',
          letterSpacing: '0.06em',
          color: '#FFCDB0',
          textShadow: '0 0 30px rgba(255,60,20,0.3)',
        }}
      >
        {category}
      </div>
      <div style={{ color: 'rgba(140,200,230,0.45)', fontSize: '0.8rem' }}>
        Bereite dich vor...
      </div>
    </div>
  );
}

/**
 * OpponentDisconnectedPhase Component
 *
 * Shown when the opponent has disconnected from the battle.
 * Displays a disconnect icon and message with a button to return to lobby.
 */
interface OpponentDisconnectedPhaseProps {
  readonly onReturnToLobby: () => void;
}

export function OpponentDisconnectedPhase({ onReturnToLobby }: OpponentDisconnectedPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center reveal">
      <div style={{ fontSize: '2.5rem' }}>⚡</div>
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '2rem',
          letterSpacing: '0.1em',
          color: 'rgba(255,200,0,0.85)',
        }}
      >
        Gegner hat aufgegeben
      </div>
      <div style={{ color: 'rgba(140,200,230,0.45)', fontSize: '0.82rem' }}>
        Dein Gegner hat die Verbindung getrennt.
      </div>
      <button
        onClick={onReturnToLobby}
        style={{
          background: 'rgba(0,212,255,0.07)',
          border: '1px solid rgba(0,212,255,0.3)',
          borderRadius: '0.875rem',
          padding: '12px 36px',
          color: 'rgba(140,200,230,0.8)',
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          cursor: 'pointer',
        }}
      >
        Zurück zur Lobby
      </button>
    </div>
  );
}

/**
 * ErrorPhase Component
 *
 * Shown when a connection or authentication error occurs.
 * Displays an error icon, error message, and button to return to lobby.
 *
 * Common error reasons:
 * - "Login erforderlich." - Session cookie missing or invalid
 * - "Verbindung unterbrochen." - Unexpected disconnection
 */
interface ErrorPhaseProps {
  readonly errorMessage: string;
  readonly onReturnToLobby: () => void;
}

export function ErrorPhase({ errorMessage, onReturnToLobby }: ErrorPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center reveal" style={{ maxWidth: '320px' }}>
      <div style={{ fontSize: '2.2rem' }}>⚠</div>
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.6rem',
          letterSpacing: '0.08em',
          color: 'rgba(255,120,80,0.9)',
        }}
      >
        Verbindungsfehler
      </div>
      <p style={{ color: 'rgba(140,200,230,0.45)', fontSize: '0.82rem', lineHeight: 1.6 }}>
        {errorMessage}
      </p>
      <button
        onClick={onReturnToLobby}
        style={{
          background: 'rgba(255,60,20,0.07)',
          border: '1px solid rgba(255,60,20,0.3)',
          borderRadius: '0.875rem',
          padding: '11px 32px',
          color: 'rgba(255,140,90,0.75)',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Zur Lobby
      </button>
    </div>
  );
}
