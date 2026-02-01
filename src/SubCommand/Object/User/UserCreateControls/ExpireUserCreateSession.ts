import { MessageFlags } from 'discord.js';
import { log } from '../../../../Common/Log.js';
import { UserCreateFlowConstants } from '../../../../Flow/Object/User/CreateState.js';
import type { UserCreateSession, UserCreateSessionStore } from './UserCreateSessionStore.js';
import { ClearUserCreateSessionTimeout } from './ClearUserCreateSessionTimeout.js';

/**
 * Expire an active user creation session, locking the controls and notifying the owner.
 * @param store UserCreateSessionStore Store that tracks session references. @example await ExpireUserCreateSession(store, session)
 * @param session UserCreateSession Session to expire. @example await ExpireUserCreateSession(store, session)
 * @param message string | undefined Optional message sent to the session owner. @example await ExpireUserCreateSession(store, session, 'Session replaced')
 * @returns Promise<void> Resolves after controls are locked. @example await ExpireUserCreateSession(store, session)
 */
export async function ExpireUserCreateSession(
    store: UserCreateSessionStore,
    session: UserCreateSession,
    message?: string,
): Promise<void> {
    if (session.state.controlsLocked) {
        return;
    }

    session.state.controlsLocked = true;
    ClearUserCreateSessionTimeout(session);
    await __DeleteSessionMessage(session, session.previewMessageId, `preview`);
    await __DeleteSessionMessage(session, session.controlsMessageId, `controls`);
    store.deleteSession(session);

    if (message) {
        try {
            await session.baseInteraction.followUp({ content: message, flags: MessageFlags.Ephemeral });
        } catch (error) {
            log.error(
                `Failed to send user create expiration notice for user ${session.userId}: ${String(error)}`,
                UserCreateFlowConstants.logSource,
            );
        }
    }
}

/**
 * Delete a session message if present, ignoring errors when missing.
 * @param session UserCreateSession Session containing webhook for delete. @example await __DeleteSessionMessage(session,'123','preview')
 * @param messageId string message identifier. @example '123'
 * @param label string label for log context. @example 'preview'
 * @returns Promise<void> completion signal.
 */
async function __DeleteSessionMessage(session: UserCreateSession, messageId: string, label: string): Promise<void> {
    if (!messageId) {
        return;
    }
    try {
        await session.baseInteraction.webhook.deleteMessage(messageId);
    } catch (error) {
        log.warning(
            `Failed to delete ${label} message for user ${session.userId}: ${error instanceof Error ? error.message : String(error)}`,
            UserCreateFlowConstants.logSource,
        );
    }
}
