import { MessageFlags } from 'discord.js';
import { PromptText } from '../../../Prompt/TextAsync.js';
import type { UserCreateSession } from './UserCreateSessionStore.js';
import type { UserCreateSessionStore } from './UserCreateSessionStore.js';
import { ClearUserCreateSessionTimeout } from './ClearUserCreateSessionTimeout.js';
import { RefreshUserCreateSessionTimeout } from './RefreshUserCreateSessionTimeout.js';
import { ExpireUserCreateSession } from './ExpireUserCreateSession.js';
import { UpdateUserCreateSessionControls, UpdateUserCreateSessionPreview } from './UserCreateSessionRenderer.js';
import { UserCreatePromptMessages, NormalizeUserCreatePromptErrorMessage } from './UserCreatePromptMessages.js';

export interface HandleUserCreateChangeFriendlyNameOptions {
    /**
     * Active session describing the current flow state.
     */
    session: UserCreateSession;
    /**
     * Session store used to refresh inactivity timers.
     */
    store: UserCreateSessionStore;
}

/**
 * Prompt the session owner to update the friendly name and refresh the preview embed.
 * @param options HandleUserCreateChangeFriendlyNameOptions Handler configuration.
 * @returns Promise<void> Resolves after the controls update.
 */
export async function HandleUserCreateChangeFriendlyName(
    options: HandleUserCreateChangeFriendlyNameOptions,
): Promise<void> {
    const { session, store } = options;
    ClearUserCreateSessionTimeout(session);
    session.state.awaitingFriendlyName = true;
    await UpdateUserCreateSessionControls(session);

    try {
        const newFriendlyName = await PromptText({
            interaction: session.baseInteraction,
            prompt: `Send the friendly name you want to use. Type **cancel** to keep the current value.`,
            minLength: 1,
            maxLength: 100,
            cancelWords: [`cancel`],
        });

        const trimmed = newFriendlyName.trim();
        if (trimmed && trimmed.toLowerCase() !== `cancel`) {
            session.state.friendlyName = trimmed;
            await UpdateUserCreateSessionPreview(session);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : UserCreatePromptMessages.genericError;
        const normalized = NormalizeUserCreatePromptErrorMessage({
            message,
            cancelMessage: UserCreatePromptMessages.friendlyNameCancel,
            timeoutMessage: UserCreatePromptMessages.friendlyNameTimeout,
            defaultMessage: UserCreatePromptMessages.genericError,
        });
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingFriendlyName = false;
        await UpdateUserCreateSessionControls(session);
        RefreshUserCreateSessionTimeout(store, session, ExpireUserCreateSession);
    }
}
