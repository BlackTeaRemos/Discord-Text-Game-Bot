import type { UserCreateSession } from './UserCreateSessionStore.js';

/**
 * Clear any active timeout associated with the supplied user creation session.
 * @param session UserCreateSession Session whose timeout should be cleared. @example ClearUserCreateSessionTimeout(session)
 * @returns void Nothing. @example ClearUserCreateSessionTimeout(session)
 */
export function ClearUserCreateSessionTimeout(session: UserCreateSession): void {
    if (session.timeoutHandle) {
        clearTimeout(session.timeoutHandle);
        session.timeoutHandle = undefined;
    }
}
