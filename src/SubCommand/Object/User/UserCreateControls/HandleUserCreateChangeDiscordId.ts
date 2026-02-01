import { MessageFlags } from 'discord.js';
import { PromptText } from '../../../Prompt/TextAsync.js';
import type { UserCreateSession } from './UserCreateSessionStore.js';
import type { UserCreateSessionStore } from './UserCreateSessionStore.js';
import { ClearUserCreateSessionTimeout } from './ClearUserCreateSessionTimeout.js';
import { RefreshUserCreateSessionTimeout } from './RefreshUserCreateSessionTimeout.js';
import { ExpireUserCreateSession } from './ExpireUserCreateSession.js';
import { UpdateUserCreateSessionControls, UpdateUserCreateSessionPreview } from './UserCreateSessionRenderer.js';
import { UserCreatePromptMessages, NormalizeUserCreatePromptErrorMessage } from './UserCreatePromptMessages.js';

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
            prompt: `Send the Discord user ID you want to register. Type **cancel** to keep the current value.`,
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
                    : `Discord IDs must contain only digits and be between 15 and 25 characters long.`;
            },
        });
        const trimmed = newDiscordId.trim();
        if (trimmed && trimmed.toLowerCase() !== `cancel`) {
            session.state.discordId = trimmed;
            await UpdateUserCreateSessionPreview(session);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : UserCreatePromptMessages.genericError;
        const normalized = NormalizeUserCreatePromptErrorMessage({
            message,
            cancelMessage: UserCreatePromptMessages.discordIdCancel,
            timeoutMessage: UserCreatePromptMessages.discordIdTimeout,
            defaultMessage: UserCreatePromptMessages.genericError,
        });
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingDiscordId = false;
        await UpdateUserCreateSessionControls(session);
        RefreshUserCreateSessionTimeout(store, session, ExpireUserCreateSession);
    }
}
