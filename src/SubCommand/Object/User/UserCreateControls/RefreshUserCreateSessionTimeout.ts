import { UserCreateFlowConstants } from '../../../../Flow/Object/User/CreateState.js';
import type { UserCreateSession, UserCreateSessionStore } from './UserCreateSessionStore.js';
import { ClearUserCreateSessionTimeout } from './ClearUserCreateSessionTimeout.js';

/**
 * Refresh the inactivity timeout for the supplied user creation session.
 * @param store UserCreateSessionStore Store maintaining session references. @example RefreshUserCreateSessionTimeout(store, session, expire)
 * @param session UserCreateSession Session being refreshed. @example RefreshUserCreateSessionTimeout(store, session, expire)
 * @param expireSession (store: UserCreateSessionStore, session: UserCreateSession, message?: string) => Promise<void> Expiration handler invoked when the timeout elapses. @example RefreshUserCreateSessionTimeout(store, session, ExpireUserCreateSession)
 * @returns void Nothing. @example RefreshUserCreateSessionTimeout(store, session, ExpireUserCreateSession)
 */
export function RefreshUserCreateSessionTimeout(
    store: UserCreateSessionStore,
    session: UserCreateSession,
    expireSession: (store: UserCreateSessionStore, session: UserCreateSession, message?: string) => Promise<void>,
): void {
    ClearUserCreateSessionTimeout(session);
    const timeoutMs = UserCreateFlowConstants.controlsTimeoutMs ?? 3 * 60 * 1000;
    session.expiresAt = Date.now() + timeoutMs;
    session.timeoutHandle = setTimeout(() => {
        void expireSession(
            store,
            session,
            `User creation timed out. Run the command again when you are ready to finish.`,
        );
    }, timeoutMs);
}
