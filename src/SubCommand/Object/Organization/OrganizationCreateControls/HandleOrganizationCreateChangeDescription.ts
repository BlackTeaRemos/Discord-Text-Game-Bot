import { MessageFlags } from 'discord.js';
import { PromptText } from '../../../Prompt/TextAsync.js';
import { sanitizeDescriptionText } from '../../../../Flow/Object/Description/BuildDefinition.js';
import type { OrganizationCreateSession } from './OrganizationCreateSessionStore.js';
import type { OrganizationCreateSessionStore } from './OrganizationCreateSessionStore.js';
import { ClearOrganizationCreateSessionTimeout } from './ClearOrganizationCreateSessionTimeout.js';
import { RefreshOrganizationCreateSessionTimeout } from './RefreshOrganizationCreateSessionTimeout.js';
import { ExpireOrganizationCreateSession } from './ExpireOrganizationCreateSession.js';
import {
    UpdateOrganizationCreateSessionControls,
    UpdateOrganizationCreateSessionPreview,
} from './OrganizationCreateSessionRenderer.js';
import {
    OrganizationCreatePromptMessages,
    NormalizeOrganizationCreatePromptErrorMessage,
} from './OrganizationCreatePromptMessages.js';

export interface HandleOrganizationCreateChangeDescriptionOptions {
    /**
     * Active session describing the current flow state.
     */
    session: OrganizationCreateSession;
    /**
     * Session store used to refresh inactivity timers.
     */
    store: OrganizationCreateSessionStore;
}

/**
 * Prompt the session owner to update the organization description and refresh the preview embed.
 * @param options HandleOrganizationCreateChangeDescriptionOptions Handler configuration.
 * @returns Promise<void> Resolves after controls update.
 */
export async function HandleOrganizationCreateChangeDescription(
    options: HandleOrganizationCreateChangeDescriptionOptions,
): Promise<void> {
    const { session, store } = options;
    ClearOrganizationCreateSessionTimeout(session);
    session.state.awaitingDescription = true;
    await UpdateOrganizationCreateSessionControls(session);

    try {
        const newDescription = await PromptText({
            interaction: session.baseInteraction,
            prompt: `Send the organization description you want to use. Type **cancel** to keep the current value.`,
            minLength: 1,
            maxLength: 1024,
            cancelWords: [`cancel`],
        });

        const trimmed = newDescription.trim();
        if (trimmed && trimmed.toLowerCase() !== `cancel`) {
            session.state.description = sanitizeDescriptionText(trimmed);
            await UpdateOrganizationCreateSessionPreview(session);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : OrganizationCreatePromptMessages.genericError;
        const normalized = NormalizeOrganizationCreatePromptErrorMessage({
            message,
            cancelMessage: OrganizationCreatePromptMessages.descriptionCancel,
            timeoutMessage: OrganizationCreatePromptMessages.descriptionTimeout,
            defaultMessage: OrganizationCreatePromptMessages.genericError,
        });
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingDescription = false;
        await UpdateOrganizationCreateSessionControls(session);
        RefreshOrganizationCreateSessionTimeout(store, session, ExpireOrganizationCreateSession);
    }
}
