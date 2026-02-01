import { MessageFlags } from 'discord.js';
import { log } from '../../../../Common/Log.js';
import { GameCreateFlowConstants } from '../../../../Flow/Object/Game/CreateState.js';
import type { GameCreateSession, GameCreateSessionStore } from './GameCreateSessionStore.js';
import { ClearGameCreateSessionTimeout } from './ClearGameCreateSessionTimeout.js';

/**
 * Expire an active session, locking its controls and optionally notifying the owner.
 * @param store GameCreateSessionStore Store managing session indexes. @example await ExpireGameCreateSession(store, session)
 * @param session GameCreateSession Session to expire. @example await ExpireGameCreateSession(store, session)
 * @param message string | undefined Optional notification message. @example await ExpireGameCreateSession(store, session, 'Session replaced')
 * @returns Promise<void> Resolves after controls lock. @example await ExpireGameCreateSession(store, session)
 */
export async function ExpireGameCreateSession(
    store: GameCreateSessionStore,
    session: GameCreateSession,
    message?: string,
): Promise<void> {
    if (session.state.controlsLocked) {
        return;
    }

    session.state.controlsLocked = true;
    ClearGameCreateSessionTimeout(session);
    await __DeleteSessionMessage(session, session.previewMessageId, `preview`);
    await __DeleteSessionMessage(session, session.controlsMessageId, `controls`);
    store.deleteSession(session);

    if (message) {
        try {
            await session.baseInteraction.followUp({ content: message, flags: MessageFlags.Ephemeral });
        } catch (error) {
            log.error(
                `Failed to send expiration notice for user ${session.userId}: ${error instanceof Error ? error.message : String(error)}`,
                GameCreateFlowConstants.logSource,
            );
        }
    }
}

/**
 * Delete a session message if it still exists.
 * @param session GameCreateSession Session containing webhook reference. @example await __deleteSessionMessage(session,'123','preview')
 * @param messageId string target message identifier. @example '123'
 * @param label string human readable label for logging. @example 'preview'
 * @returns Promise<void> Resolves after delete attempt completes.
 */
async function __DeleteSessionMessage(session: GameCreateSession, messageId: string, label: string): Promise<void> {
    if (!messageId) {
        return;
    }
    try {
        await session.baseInteraction.webhook.deleteMessage(messageId);
    } catch (error) {
        log.warning(
            `Failed to delete ${label} message for user ${session.userId}: ${error instanceof Error ? error.message : String(error)}`,
            GameCreateFlowConstants.logSource,
        );
    }
}
