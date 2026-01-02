import { MessageFlags } from 'discord.js';
import { log } from '../../../../Common/Log.js';
import { OrganizationCreateFlowConstants } from '../../../../Flow/Object/Organization/CreateState.js';
import type { OrganizationCreateSession, OrganizationCreateSessionStore } from './OrganizationCreateSessionStore.js';
import { ClearOrganizationCreateSessionTimeout } from './ClearOrganizationCreateSessionTimeout.js';

/**
 * Expire an active organization creation session, locking the controls and notifying the owner.
 * @param store OrganizationCreateSessionStore Store that tracks session references. @example await ExpireOrganizationCreateSession(store, session)
 * @param session OrganizationCreateSession Session to expire. @example await ExpireOrganizationCreateSession(store, session)
 * @param message string | undefined Optional message sent to the session owner. @example await ExpireOrganizationCreateSession(store, session, 'Session replaced')
 * @returns Promise<void> Resolves after controls are locked.
 */
export async function ExpireOrganizationCreateSession(
    store: OrganizationCreateSessionStore,
    session: OrganizationCreateSession,
    message?: string,
): Promise<void> {
    if (session.state.controlsLocked) {
        return;
    }

    session.state.controlsLocked = true;
    ClearOrganizationCreateSessionTimeout(session);
    await __DeleteSessionMessage(session, session.previewMessageId, `preview`);
    await __DeleteSessionMessage(session, session.controlsMessageId, `controls`);
    store.deleteSession(session);

    if (message) {
        try {
            await session.baseInteraction.followUp({ content: message, flags: MessageFlags.Ephemeral });
        } catch (error) {
            log.error(
                `Failed to send organization create expiration notice for user ${session.userId}: ${String(error)}`,
                OrganizationCreateFlowConstants.logSource,
            );
        }
    }
}

/**
 * Delete a session message if present, suppressing errors.
 * @param session OrganizationCreateSession Session providing webhook access. @example await __DeleteSessionMessage(session,'123','preview')
 * @param messageId string message identifier to remove. @example '123'
 * @param label string label used for logging context. @example 'preview'
 * @returns Promise<void> resolves once delete attempt finishes.
 */
async function __DeleteSessionMessage(
    session: OrganizationCreateSession,
    messageId: string,
    label: string,
): Promise<void> {
    if (!messageId) {
        return;
    }
    try {
        await session.baseInteraction.webhook.deleteMessage(messageId);
    } catch (error) {
        log.warning(
            `Failed to delete ${label} message for user ${session.userId}: ${error instanceof Error ? error.message : String(error)}`,
            OrganizationCreateFlowConstants.logSource,
        );
    }
}
