import { GameCreateFlowConstants } from '../../../../Flow/Object/Game/CreateState.js';
import type { GameCreateSession, GameCreateSessionStore } from './GameCreateSessionStore.js';
import { ClearGameCreateSessionTimeout } from './ClearGameCreateSessionTimeout.js';
import { ResolveGameCreateFlowLabel } from './ResolveGameCreateFlowLabel.js';
import { CapitalizeValue } from './CapitalizeValue.js';

/**
 * Refresh the inactivity timeout for the supplied session, expiring it automatically when reached.
 * @param store GameCreateSessionStore Store managing the session indexes. @example RefreshGameCreateSessionTimeout(store, session)
 * @param session GameCreateSession Session being refreshed. @example RefreshGameCreateSessionTimeout(store, session)
 * @param expireSession (store: GameCreateSessionStore, session: GameCreateSession, message?: string) => Promise<void> Expiration handler invoked on timeout. @example RefreshGameCreateSessionTimeout(store, session, ExpireGameCreateSession)
 * @returns void Timeout refreshed. @example RefreshGameCreateSessionTimeout(store, session)
 */
export function RefreshGameCreateSessionTimeout(
    store: GameCreateSessionStore,
    session: GameCreateSession,
    expireSession: (store: GameCreateSessionStore, session: GameCreateSession, message?: string) => Promise<void>,
): void {
    ClearGameCreateSessionTimeout(session);
    const timeoutMs = GameCreateFlowConstants.controlsTimeoutMs ?? 5 * 60 * 1000; // fallback timeout
    session.expiresAt = Date.now() + timeoutMs;
    session.timeoutHandle = setTimeout(() => {
        void expireSession(
            store,
            session,
            `${CapitalizeValue(ResolveGameCreateFlowLabel(session.state))} timed out. Start the command again to continue.`,
        );
    }, timeoutMs);
}
