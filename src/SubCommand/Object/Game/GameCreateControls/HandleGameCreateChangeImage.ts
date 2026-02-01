import { MessageFlags } from 'discord.js';
import { AwaitImageInput } from '../../../Prompt/ImageAsync.js';
import type { GameCreateSession } from './GameCreateSessionStore.js';
import type { GameCreateSessionStore } from './GameCreateSessionStore.js';
import { ClearGameCreateSessionTimeout } from './ClearGameCreateSessionTimeout.js';
import { RefreshGameCreateSessionTimeout } from './RefreshGameCreateSessionTimeout.js';
import { ExpireGameCreateSession } from './ExpireGameCreateSession.js';
import { UpdateGameCreateSessionControls, UpdateGameCreateSessionPreview } from './GameCreateSessionRenderer.js';
import { GameCreatePromptMessages, NormalizeGameCreatePromptErrorMessage } from './GameCreatePromptMessages.js';

export interface HandleGameCreateChangeImageOptions {
    /**
     * Session describing the active game creation flow.
     * @example options.session.state.imageUrl
     */
    session: GameCreateSession;
    /**
     * Session store required to refresh inactivity timeouts.
     * @example options.store.getByUser('123')
     */
    store: GameCreateSessionStore;
}

/**
 * Prompt the session owner for an updated image and refresh the preview embed.
 * @param options HandleGameCreateChangeImageOptions Handler configuration.
 * @returns Promise<void> Resolves after the controls are refreshed.
 * @example await HandleGameCreateChangeImage({ session, store });
 */
export async function HandleGameCreateChangeImage(options: HandleGameCreateChangeImageOptions): Promise<void> {
    const { session, store } = options;
    ClearGameCreateSessionTimeout(session);
    session.state.awaitingImage = true;
    session.state.uploadInProgress = true;
    await UpdateGameCreateSessionControls(session);

    try {
        const result = await AwaitImageInput({
            interaction: session.baseInteraction,
            prompt: `Upload the game image or paste a direct image URL. Type **cancel** to keep the current image.`,
            cancelWords: [`cancel`],
            maxFileSizeBytes: 5 * 1024 * 1024,
        });
        session.state.imageUrl = result.url;
        await UpdateGameCreateSessionPreview(session);
    } catch (error) {
        const message = error instanceof Error ? error.message : GameCreatePromptMessages.genericError;
        const normalized = NormalizeGameCreatePromptErrorMessage({
            message,
            cancelMessage: GameCreatePromptMessages.imageCancel,
            timeoutMessage: GameCreatePromptMessages.imageTimeout,
            defaultMessage: GameCreatePromptMessages.genericError,
        });
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingImage = false;
        session.state.uploadInProgress = false;
        await UpdateGameCreateSessionControls(session);
        RefreshGameCreateSessionTimeout(store, session, ExpireGameCreateSession);
    }
}
