import type { OrganizationCreateSession } from './OrganizationCreateSessionStore.js';

/**
 * Clear any active timeout associated with the supplied organization creation session.
 * @param session OrganizationCreateSession Session whose timeout should be cleared. @example ClearOrganizationCreateSessionTimeout(session)
 * @returns void Nothing.
 */
export function ClearOrganizationCreateSessionTimeout(session: OrganizationCreateSession): void {
    if (session.timeoutHandle) {
        clearTimeout(session.timeoutHandle);
        session.timeoutHandle = undefined;
    }
}
