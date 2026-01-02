import { MessageFlags } from 'discord.js';
import { PromptText } from '../../../Prompt/TextAsync.js';
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

export interface HandleOrganizationCreateChangeFriendlyNameOptions {
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
 * Prompt the session owner to update the friendly name and refresh the preview embed.
 * @param options HandleOrganizationCreateChangeFriendlyNameOptions Handler configuration.
 * @returns Promise<void> Resolves after the controls update.
 */
export async function HandleOrganizationCreateChangeFriendlyName(
    options: HandleOrganizationCreateChangeFriendlyNameOptions,
): Promise<void> {
    const { session, store } = options;
    ClearOrganizationCreateSessionTimeout(session);
    session.state.awaitingFriendlyName = true;
    await UpdateOrganizationCreateSessionControls(session);

    try {
        const newFriendlyName = await PromptText({
            interaction: session.baseInteraction,
            prompt: `Send the friendly name to display. Type **cancel** to keep the current value.`,
            minLength: 1,
            maxLength: 100,
            cancelWords: [`cancel`],
        });
        const trimmed = newFriendlyName.trim();
        if (trimmed) {
            session.state.friendlyName = trimmed;
        }
        await UpdateOrganizationCreateSessionPreview(session);
    } catch (error) {
        const message = error instanceof Error ? error.message : OrganizationCreatePromptMessages.genericError;
        const normalized = NormalizeOrganizationCreatePromptErrorMessage({
            message,
            cancelMessage: OrganizationCreatePromptMessages.friendlyCancel,
            defaultMessage: OrganizationCreatePromptMessages.genericError,
        });
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingFriendlyName = false;
        await UpdateOrganizationCreateSessionControls(session);
        RefreshOrganizationCreateSessionTimeout(store, session, ExpireOrganizationCreateSession);
    }
}
