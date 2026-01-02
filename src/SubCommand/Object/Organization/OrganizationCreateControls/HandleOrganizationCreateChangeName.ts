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

export interface HandleOrganizationCreateChangeNameOptions {
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
 * Prompt the session owner to update the organization name and refresh the preview embed.
 * @param options HandleOrganizationCreateChangeNameOptions Handler configuration.
 * @returns Promise<void> Resolves after the controls update.
 */
export async function HandleOrganizationCreateChangeName(
    options: HandleOrganizationCreateChangeNameOptions,
): Promise<void> {
    const { session, store } = options;
    ClearOrganizationCreateSessionTimeout(session);
    session.state.awaitingName = true;
    await UpdateOrganizationCreateSessionControls(session);

    try {
        const newName = await PromptText({
            interaction: session.baseInteraction,
            prompt: `Send the organization name you want to use. Type **cancel** to keep the current value.`,
            minLength: 1,
            maxLength: 100,
            cancelWords: [`cancel`],
        });
        const trimmed = newName.trim();
        if (trimmed) {
            session.state.organizationName = trimmed;
            if (!session.state.friendlyName || session.state.friendlyName === `New organization`) {
                session.state.friendlyName = trimmed;
            }
            await UpdateOrganizationCreateSessionPreview(session);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : OrganizationCreatePromptMessages.genericError;
        const normalized = NormalizeOrganizationCreatePromptErrorMessage({
            message,
            cancelMessage: OrganizationCreatePromptMessages.nameCancel,
            defaultMessage: OrganizationCreatePromptMessages.genericError,
        });
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingName = false;
        await UpdateOrganizationCreateSessionControls(session);
        RefreshOrganizationCreateSessionTimeout(store, session, ExpireOrganizationCreateSession);
    }
}
