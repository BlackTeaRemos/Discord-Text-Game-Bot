import { OrganizationCreateFlowConstants } from '../../../../Flow/Object/Organization/CreateState.js';
import type { OrganizationCreateSession, OrganizationCreateSessionStore } from './OrganizationCreateSessionStore.js';
import { ClearOrganizationCreateSessionTimeout } from './ClearOrganizationCreateSessionTimeout.js';

/**
 * Refresh the inactivity timeout for the supplied organization creation session.
 * @param store OrganizationCreateSessionStore Store maintaining session references. @example RefreshOrganizationCreateSessionTimeout(store, session, expire)
 * @param session OrganizationCreateSession Session being refreshed. @example RefreshOrganizationCreateSessionTimeout(store, session, expire)
 * @param expireSession (store: OrganizationCreateSessionStore, session: OrganizationCreateSession, message?: string) => Promise<void> Expiration handler invoked when the timeout elapses. @example RefreshOrganizationCreateSessionTimeout(store, session, ExpireOrganizationCreateSession)
 * @returns void Nothing.
 */
export function RefreshOrganizationCreateSessionTimeout(
    store: OrganizationCreateSessionStore,
    session: OrganizationCreateSession,
    expireSession: (
        store: OrganizationCreateSessionStore,
        session: OrganizationCreateSession,
        message?: string,
    ) => Promise<void>,
): void {
    ClearOrganizationCreateSessionTimeout(session);
    const timeoutMs = OrganizationCreateFlowConstants.controlsTimeoutMs ?? 3 * 60 * 1000;
    session.expiresAt = Date.now() + timeoutMs;
    session.timeoutHandle = setTimeout(() => {
        void expireSession(
            store,
            session,
            `Organization creation timed out. Run the command again when you are ready to finish.`,
        );
    }, timeoutMs);
}
