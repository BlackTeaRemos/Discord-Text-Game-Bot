import { MessageFlags } from 'discord.js';
import { PromptText } from '../../../Prompt/TextAsync.js';
import type { GameCreateSession } from './GameCreateSessionStore.js';
import type { GameCreateSessionStore } from './GameCreateSessionStore.js';
import { ClearGameCreateSessionTimeout } from './ClearGameCreateSessionTimeout.js';
import { RefreshGameCreateSessionTimeout } from './RefreshGameCreateSessionTimeout.js';
import { ExpireGameCreateSession } from './ExpireGameCreateSession.js';
import { UpdateGameCreateSessionControls, UpdateGameCreateSessionPreview } from './GameCreateSessionRenderer.js';
import { GameCreatePromptMessages, NormalizeGameCreatePromptErrorMessage } from './GameCreatePromptMessages.js';

export interface HandleGameCreateChangeNameOptions {
    /**
     * Active session referenced by the control interaction.
     * @example options.session.state.gameName
     */
    session: GameCreateSession;
    /**
     * Shared session store used to manage timeouts.
     * @example options.store.getByUser('123')
     */
    store: GameCreateSessionStore;
}

/**
 * Prompt the session owner to provide a new game name and refresh the preview.
 * @param options HandleGameCreateChangeNameOptions Handler configuration.
 * @returns Promise<void> Resolves when the controls have been refreshed.
 * @example await HandleGameCreateChangeName({ session, store });
 */
export async function HandleGameCreateChangeName(options: HandleGameCreateChangeNameOptions): Promise<void> {
    const { session, store } = options;
    ClearGameCreateSessionTimeout(session);
    session.state.awaitingName = true;
    await UpdateGameCreateSessionControls(session);

    try {
        const newName = await PromptText({
            interaction: session.baseInteraction,
            prompt: `Send the game title you want to use. Type **cancel** to keep the current name.`,
            minLength: 1,
            maxLength: 100,
            cancelWords: [`cancel`],
        });
        const trimmed = newName.trim();
        if (trimmed) {
            session.state.gameName = trimmed;
            await UpdateGameCreateSessionPreview(session);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : GameCreatePromptMessages.genericError;
        const normalized = NormalizeGameCreatePromptErrorMessage({
            message,
            cancelMessage: GameCreatePromptMessages.nameCancel,
            defaultMessage: GameCreatePromptMessages.genericError,
        });
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingName = false;
        await UpdateGameCreateSessionControls(session);
        RefreshGameCreateSessionTimeout(store, session, ExpireGameCreateSession);
    }
}
