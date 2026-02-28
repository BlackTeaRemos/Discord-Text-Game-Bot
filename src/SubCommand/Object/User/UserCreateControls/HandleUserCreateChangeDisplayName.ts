import { MessageFlags } from 'discord.js';
import { PromptText } from '../../../Prompt/TextAsync.js';
import type { UserCreateSession } from './UserCreateSessionStore.js';
import type { UserCreateSessionStore } from './UserCreateSessionStore.js';
import { ClearUserCreateSessionTimeout } from './ClearUserCreateSessionTimeout.js';
import { RefreshUserCreateSessionTimeout } from './RefreshUserCreateSessionTimeout.js';
import { ExpireUserCreateSession } from './ExpireUserCreateSession.js';
import { UpdateUserCreateSessionControls, UpdateUserCreateSessionPreview } from './UserCreateSessionRenderer.js';
import { GetUserCreatePromptMessages, NormalizeUserCreatePromptErrorMessage } from './UserCreatePromptMessages.js';
import { TranslateFromContext } from '../../../../Services/I18nService.js';

export interface HandleUserCreateChangeDisplayNameOptions {
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
 * Prompt the session owner to update the display name and refresh the preview embed.
 * @param options HandleUserCreateChangeDisplayNameOptions Handler configuration.
 * @returns Promise<void> Resolves after the controls update.
 */
export async function HandleUserCreateChangeDisplayName(
    options: HandleUserCreateChangeDisplayNameOptions,
): Promise<void> {
    const { session, store } = options;
    ClearUserCreateSessionTimeout(session);
    session.state.awaitingDisplayName = true;
    await UpdateUserCreateSessionControls(session);

    try {
        const newDisplayName = await PromptText({
            interaction: session.baseInteraction,
            prompt: TranslateFromContext((session.baseInteraction as any).executionContext, `userCreate.prompt.displayNamePrompt`),
            minLength: 1,
            maxLength: 100,
            cancelWords: [`cancel`],
        });

        const trimmed = newDisplayName.trim();
        if (trimmed && trimmed.toLowerCase() !== `cancel`) {
            session.state.displayName = trimmed;
            if (!session.state.friendlyName || session.state.friendlyName === `New user`) {
                session.state.friendlyName = trimmed;
            }
            await UpdateUserCreateSessionPreview(session);
        }
    } catch(error) {
        const promptMessages = GetUserCreatePromptMessages((session.baseInteraction as any).executionContext);
        const message = error instanceof Error ? error.message : promptMessages.genericError;
        const normalized = NormalizeUserCreatePromptErrorMessage({
            message,
            cancelMessage: promptMessages.displayNameCancel,
            timeoutMessage: promptMessages.displayNameTimeout,
            defaultMessage: promptMessages.genericError,
        }, (session.baseInteraction as any).executionContext);
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingDisplayName = false;
        await UpdateUserCreateSessionControls(session);
        RefreshUserCreateSessionTimeout(store, session, ExpireUserCreateSession);
    }
}
