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

export interface HandleUserCreateChangeDiscordIdOptions {
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
 * Prompt the session owner to update the Discord ID and refresh the preview embed.
 * @param options HandleUserCreateChangeDiscordIdOptions Handler configuration. @example await HandleUserCreateChangeDiscordId({ session, store })
 * @returns Promise<void> Resolves after the controls update. @example await HandleUserCreateChangeDiscordId({ session, store })
 */
export async function HandleUserCreateChangeDiscordId(options: HandleUserCreateChangeDiscordIdOptions): Promise<void> {
    const { session, store } = options;
    ClearUserCreateSessionTimeout(session);
    session.state.awaitingDiscordId = true;
    await UpdateUserCreateSessionControls(session);

    try {
        const newDiscordId = await PromptText({
            interaction: session.baseInteraction,
            prompt: TranslateFromContext((session.baseInteraction as any).executionContext, `userCreate.prompt.discordIdPrompt`),
            minLength: 2,
            maxLength: 32,
            cancelWords: [`cancel`],
            validator: (value: string) => {
                const trimmed = value.trim();
                if (trimmed.toLowerCase() === `cancel`) {
                    return true;
                }
                return /^\d{15,25}$/.test(trimmed)
                    ? true
                    : TranslateFromContext((session.baseInteraction as any).executionContext, `userCreate.prompt.discordIdValidation`);
            },
        });
        const trimmed = newDiscordId.trim();
        if (trimmed && trimmed.toLowerCase() !== `cancel`) {
            session.state.discordId = trimmed;
            await UpdateUserCreateSessionPreview(session);
        }
    } catch (error) {
        const promptMessages = GetUserCreatePromptMessages((session.baseInteraction as any).executionContext);
        const message = error instanceof Error ? error.message : promptMessages.genericError;
        const normalized = NormalizeUserCreatePromptErrorMessage({
            message,
            cancelMessage: promptMessages.discordIdCancel,
            timeoutMessage: promptMessages.discordIdTimeout,
            defaultMessage: promptMessages.genericError,
        }, (session.baseInteraction as any).executionContext);
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingDiscordId = false;
        await UpdateUserCreateSessionControls(session);
        RefreshUserCreateSessionTimeout(store, session, ExpireUserCreateSession);
    }
}
