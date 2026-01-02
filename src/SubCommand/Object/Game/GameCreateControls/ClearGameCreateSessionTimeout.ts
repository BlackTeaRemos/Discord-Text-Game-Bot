import type { GameCreateSession } from './GameCreateSessionStore.js';

/**
 * Clear any active timeout associated with the provided session.
 * @param session GameCreateSession Session whose timeout should be cleared. @example ClearGameCreateSessionTimeout(session)
 * @returns void Timeout cleared. @example ClearGameCreateSessionTimeout(session)
 */
export function ClearGameCreateSessionTimeout(session: GameCreateSession): void {
    if (session.timeoutHandle) {
        clearTimeout(session.timeoutHandle);
        session.timeoutHandle = undefined;
    }
}
