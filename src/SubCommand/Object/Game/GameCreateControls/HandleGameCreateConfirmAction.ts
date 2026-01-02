import { MessageFlags } from 'discord.js';
import { FinalizeGameCreation, FinalizeGameUpdate } from '../../../../Flow/Object/Game/CreateFinalize.js';
import { ResolveGameCreateSuccessMessage } from './ResolveGameCreateSuccessMessage.js';
import { ResolveGameCreateFlowLabel } from './ResolveGameCreateFlowLabel.js';
import type { GameCreateSession } from './GameCreateSessionStore.js';
import type { GameCreateSessionStore } from './GameCreateSessionStore.js';
import { ClearGameCreateSessionTimeout } from './ClearGameCreateSessionTimeout.js';
import { RefreshGameCreateSessionTimeout } from './RefreshGameCreateSessionTimeout.js';
import { ExpireGameCreateSession } from './ExpireGameCreateSession.js';
import { UpdateGameCreateSessionControls } from './GameCreateSessionRenderer.js';
import { GameCreatePromptMessages } from './GameCreatePromptMessages.js';

export interface HandleGameCreateConfirmActionOptions {
    /**
     * Session capturing mutable flow state.
     * @example options.session.state.mode
     */
    session: GameCreateSession;
    /**
     * Session store used to manage timeouts.
     * @example options.store.getByUser('123')
     */
    store: GameCreateSessionStore;
}

/**
 * Finalize the game creation or update workflow and send relevant feedback to the user.
 * @param options HandleGameCreateConfirmActionOptions Handler configuration.
 * @returns Promise<void> Resolves after persistence completes or an error is surfaced.
 * @example await HandleGameCreateConfirmAction({ session, store });
 */
export async function HandleGameCreateConfirmAction(options: HandleGameCreateConfirmActionOptions): Promise<void> {
    const { session, store } = options;
    ClearGameCreateSessionTimeout(session);
    session.state.finalizing = true;
    await UpdateGameCreateSessionControls(session);

    try {
        const result =
            session.state.mode === `update`
                ? await FinalizeGameUpdate(session.state)
                : await FinalizeGameCreation(session.state);
        if (!result.success || !result.game) {
            session.state.finalizing = false;
            await UpdateGameCreateSessionControls(session);
            RefreshGameCreateSessionTimeout(store, session, ExpireGameCreateSession);
            await session.baseInteraction.followUp({
                content: `${ResolveGameCreateFlowLabel(session.state, `title`)} did not complete.${
                    result.error ? ` Reason: ${result.error}` : ``
                }`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await ExpireGameCreateSession(store, session, ResolveGameCreateSuccessMessage(session.state, result.game.name));
    } catch (error) {
        session.state.finalizing = false;
        await UpdateGameCreateSessionControls(session);
        RefreshGameCreateSessionTimeout(store, session, ExpireGameCreateSession);
        const message = error instanceof Error ? error.message : GameCreatePromptMessages.genericError;
        await session.baseInteraction.followUp({
            content: `Failed to finalize ${ResolveGameCreateFlowLabel(session.state)}: ${message}`,
            flags: MessageFlags.Ephemeral,
        });
    }
}
