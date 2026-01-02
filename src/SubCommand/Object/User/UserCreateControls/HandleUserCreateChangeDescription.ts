import { MessageFlags } from 'discord.js';
import { PromptText } from '../../../Prompt/TextAsync.js';
import { sanitizeDescriptionText } from '../../../../Flow/Object/Description/BuildDefinition.js';
import type { UserCreateSession } from './UserCreateSessionStore.js';
import type { UserCreateSessionStore } from './UserCreateSessionStore.js';
import { ClearUserCreateSessionTimeout } from './ClearUserCreateSessionTimeout.js';
import { RefreshUserCreateSessionTimeout } from './RefreshUserCreateSessionTimeout.js';
import { ExpireUserCreateSession } from './ExpireUserCreateSession.js';
import { UpdateUserCreateSessionControls, UpdateUserCreateSessionPreview } from './UserCreateSessionRenderer.js';
import { UserCreatePromptMessages, NormalizeUserCreatePromptErrorMessage } from './UserCreatePromptMessages.js';

export interface HandleUserCreateChangeDescriptionOptions {
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
 * Prompt the session owner to update the user description and refresh the preview embed.
 * @param options HandleUserCreateChangeDescriptionOptions Handler configuration.
 * @returns Promise<void> Resolves after the controls update.
 */
export async function HandleUserCreateChangeDescription(
    options: HandleUserCreateChangeDescriptionOptions,
): Promise<void> {
    const { session, store } = options;
    ClearUserCreateSessionTimeout(session);
    session.state.awaitingDescription = true;
    await UpdateUserCreateSessionControls(session);

    try {
        const newDescription = await PromptText({
            interaction: session.baseInteraction,
            prompt: `Send the profile description you want to use. Type **cancel** to keep the current value.`,
            minLength: 1,
            maxLength: 1024,
            cancelWords: [`cancel`],
        });

        const trimmed = newDescription.trim();
        if (trimmed && trimmed.toLowerCase() !== `cancel`) {
            session.state.description = sanitizeDescriptionText(trimmed);
            await UpdateUserCreateSessionPreview(session);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : UserCreatePromptMessages.genericError;
        const normalized = NormalizeUserCreatePromptErrorMessage({
            message,
            cancelMessage: UserCreatePromptMessages.descriptionCancel,
            timeoutMessage: UserCreatePromptMessages.descriptionTimeout,
            defaultMessage: UserCreatePromptMessages.genericError,
        });
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingDescription = false;
        await UpdateUserCreateSessionControls(session);
        RefreshUserCreateSessionTimeout(store, session, ExpireUserCreateSession);
    }
}
