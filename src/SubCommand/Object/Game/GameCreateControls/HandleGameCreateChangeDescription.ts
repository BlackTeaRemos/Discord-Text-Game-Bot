import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { sanitizeDescriptionText } from '../../../../Flow/Object/Description/BuildDefinition.js';
import { RunDescriptionComposerFlow } from '../../../../Flow/Object/Description/Composer/DescriptionComposerFlow.js';
import { RunDescriptionEditorFlow } from '../../../../Flow/Object/Description/Editor/DescriptionEditorFlow.js';
import { BuildDefaultDescriptionEditorPermissions } from '../../../../Flow/Object/Description/Editor/BuildDefaultDescriptionEditorPermissions.js';
import { GetPriorityScopedDescription } from '../../../../Flow/Object/Description/Scope/GetPriorityScopedDescription.js';
import type { GameCreateSession } from './GameCreateSessionStore.js';
import type { GameCreateSessionStore } from './GameCreateSessionStore.js';
import { ClearGameCreateSessionTimeout } from './ClearGameCreateSessionTimeout.js';
import { RefreshGameCreateSessionTimeout } from './RefreshGameCreateSessionTimeout.js';
import { ExpireGameCreateSession } from './ExpireGameCreateSession.js';
import { UpdateGameCreateSessionControls, UpdateGameCreateSessionPreview } from './GameCreateSessionRenderer.js';
import { GameCreatePromptMessages } from './GameCreatePromptMessages.js';

export interface HandleGameCreateChangeDescriptionOptions {
    /**
     * Active session describing the current game creation flow.
     * @example options.session.state.description
     */
    session: GameCreateSession;
    /**
     * Shared session store coordinating timeouts.
     * @example options.store.getByControlMessage(id)
     */
    store: GameCreateSessionStore;
}

/**
 * Prompt the session owner for a revised description and refresh the preview embed.
 * For new games (create mode), uses simple text prompt.
 * For existing games (update mode), launches the common description editor flow.
 * @param options HandleGameCreateChangeDescriptionOptions Handler configuration.
 * @returns Promise<void> Resolves after the controls are updated.
 * @example await HandleGameCreateChangeDescription({ session, store });
 */
export async function HandleGameCreateChangeDescription(
    options: HandleGameCreateChangeDescriptionOptions,
): Promise<void> {
    const { session, store } = options;

    if (session.state.mode === `update` && session.state.gameUid) {
        await __HandleUpdateModeDescription(session, store);
    } else {
        await __HandleCreateModeDescription(session, store);
    }
}

/**
 * Handle description editing for new game creation using composer flow.
 * @param session GameCreateSession Active session.
 * @param store GameCreateSessionStore Session store for timeout management.
 */
async function __HandleCreateModeDescription(
    session: GameCreateSession,
    store: GameCreateSessionStore,
): Promise<void> {
    ClearGameCreateSessionTimeout(session);
    session.state.awaitingDescription = true;
    await UpdateGameCreateSessionControls(session);

    try {
        const result = await RunDescriptionComposerFlow(
            session.baseInteraction as unknown as ChatInputCommandInteraction,
            {
                initialContent: session.state.description,
                maxLength: 1024,
                prompt: `Send the full game description text. Type **cancel** to keep the current description.`,
                cancelWords: [`cancel`],
                userUid: session.userId,
                organizationUid: session.state.organizationUid ?? null,
                canEditGlobal: false,
            },
        );

        if (result.success && result.content) {
            session.state.description = sanitizeDescriptionText(result.content);
            await UpdateGameCreateSessionPreview(session);
        } else if (result.cancelled) {
            await session.baseInteraction.followUp({
                content: GameCreatePromptMessages.descriptionCancel,
                flags: MessageFlags.Ephemeral,
            });
        }
    } catch(error) {
        const message = error instanceof Error ? error.message : GameCreatePromptMessages.genericError;
        await session.baseInteraction.followUp({ content: message, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingDescription = false;
        await UpdateGameCreateSessionControls(session);
        RefreshGameCreateSessionTimeout(store, session, ExpireGameCreateSession);
    }
}

/**
 * Handle description editing for existing game using common description editor flow.
 * After editor closes, syncs state with the updated persisted description.
 * @param session GameCreateSession Active session with gameUid.
 * @param store GameCreateSessionStore Session store for timeout management.
 */
async function __HandleUpdateModeDescription(
    session: GameCreateSession,
    store: GameCreateSessionStore,
): Promise<void> {
    ClearGameCreateSessionTimeout(session);
    session.state.awaitingDescription = true;
    await UpdateGameCreateSessionControls(session);

    const gameUid = session.state.gameUid!;
    const isAdmin = session.baseInteraction.memberPermissions?.has(`Administrator`) ?? false;

    try {
        await RunDescriptionEditorFlow(
            session.baseInteraction as unknown as ChatInputCommandInteraction,
            {
                objectType: `game`,
                objectUid: gameUid,
                userUid: session.userId,
                organizationUid: session.state.organizationUid ?? null,
                canEditGlobal: isAdmin,
                permissions: BuildDefaultDescriptionEditorPermissions(isAdmin),
            },
        );

        // Sync state with persisted description after editor closes
        const organizationUids = session.state.organizationUid ? [session.state.organizationUid] : [];
        const priorityDescription = await GetPriorityScopedDescription({
            objectType: `game`,
            objectUid: gameUid,
            userUid: session.userId,
            organizationUids,
        });
        if (priorityDescription) {
            session.state.description = sanitizeDescriptionText(priorityDescription.content);
        }

        await UpdateGameCreateSessionPreview(session);
    } catch(error) {
        const message = error instanceof Error ? error.message : GameCreatePromptMessages.genericError;
        await session.baseInteraction.followUp({ content: message, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingDescription = false;
        await UpdateGameCreateSessionControls(session);
        RefreshGameCreateSessionTimeout(store, session, ExpireGameCreateSession);
    }
}
