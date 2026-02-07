import { MessageFlags } from 'discord.js';
import { PromptText } from '../../../Prompt/TextAsync.js';
import { sanitizeDescriptionText } from '../../../../Flow/Object/Description/BuildDefinition.js';
import type { UserCreateSession } from './UserCreateSessionStore.js';
import type { UserCreateSessionStore } from './UserCreateSessionStore.js';
import { ClearUserCreateSessionTimeout } from './ClearUserCreateSessionTimeout.js';
import { RefreshUserCreateSessionTimeout } from './RefreshUserCreateSessionTimeout.js';
import { ExpireUserCreateSession } from './ExpireUserCreateSession.js';
import { UpdateUserCreateSessionControls, UpdateUserCreateSessionPreview } from './UserCreateSessionRenderer.js';
import { GetUserCreatePromptMessages, NormalizeUserCreatePromptErrorMessage } from './UserCreatePromptMessages.js';
import { TranslateFromContext } from '../../../../Services/I18nService.js';

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
            prompt: TranslateFromContext((session.baseInteraction as any).executionContext, `userCreate.prompt.descriptionPrompt`),
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
        const promptMessages = GetUserCreatePromptMessages((session.baseInteraction as any).executionContext);
        const message = error instanceof Error ? error.message : promptMessages.genericError;
        const normalized = NormalizeUserCreatePromptErrorMessage({
            message,
            cancelMessage: promptMessages.descriptionCancel,
            timeoutMessage: promptMessages.descriptionTimeout,
            defaultMessage: promptMessages.genericError,
        }, (session.baseInteraction as any).executionContext);
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingDescription = false;
        await UpdateUserCreateSessionControls(session);
        RefreshUserCreateSessionTimeout(store, session, ExpireUserCreateSession);
    }
}
