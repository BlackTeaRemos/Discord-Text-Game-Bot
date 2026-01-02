import { MessageFlags } from 'discord.js';
import { CreateOrganization } from '../../../../Flow/Object/Organization/Create.js';
import { sanitizeDescriptionText } from '../../../../Flow/Object/Description/BuildDefinition.js';
import { SaveScopedDescription } from '../../../../Flow/Object/Description/Scope/SaveScopedDescription.js';
import { OrganizationCreatePromptMessages } from './OrganizationCreatePromptMessages.js';
import type { OrganizationCreateSession } from './OrganizationCreateSessionStore.js';
import type { OrganizationCreateSessionStore } from './OrganizationCreateSessionStore.js';
import { ClearOrganizationCreateSessionTimeout } from './ClearOrganizationCreateSessionTimeout.js';
import { RefreshOrganizationCreateSessionTimeout } from './RefreshOrganizationCreateSessionTimeout.js';
import { ExpireOrganizationCreateSession } from './ExpireOrganizationCreateSession.js';
import { UpdateOrganizationCreateSessionControls } from './OrganizationCreateSessionRenderer.js';

export interface HandleOrganizationCreateConfirmActionOptions {
    /**
     * Session capturing mutable flow state.
     */
    session: OrganizationCreateSession;
    /**
     * Session store used to refresh inactivity timers.
     */
    store: OrganizationCreateSessionStore;
}

/**
 * Persist the organization using the configured flow state.
 * @param options HandleOrganizationCreateConfirmActionOptions Handler configuration.
 * @returns Promise<void> Resolves after persistence completes or fails.
 */
export async function HandleOrganizationCreateConfirmAction(
    options: HandleOrganizationCreateConfirmActionOptions,
): Promise<void> {
    const { session, store } = options;
    ClearOrganizationCreateSessionTimeout(session);
    session.state.finalizing = true;
    await UpdateOrganizationCreateSessionControls(session);

    try {
        const trimmedName = session.state.organizationName.trim();
        if (!trimmedName) {
            session.state.finalizing = false;
            await UpdateOrganizationCreateSessionControls(session);
            RefreshOrganizationCreateSessionTimeout(store, session, ExpireOrganizationCreateSession);
            await session.baseInteraction.followUp({
                content: `Set an organization name before continuing.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const friendlyName = session.state.friendlyName.trim() || trimmedName;
        const created = await CreateOrganization(trimmedName, friendlyName);

        const descriptionText = sanitizeDescriptionText(session.state.description);
        await SaveScopedDescription({
            objectType: `organization`,
            objectUid: created.uid,
            scope: {
                scopeType: `global`,
                scopeUid: null,
                label: `Official Description`,
            },
            content: descriptionText,
            createdBy: session.state.ownerDiscordId,
        });

        await ExpireOrganizationCreateSession(store, session, `Organization '${created.name}' created successfully.`);
    } catch(error) {
        session.state.finalizing = false;
        await UpdateOrganizationCreateSessionControls(session);
        RefreshOrganizationCreateSessionTimeout(store, session, ExpireOrganizationCreateSession);
        const message = error instanceof Error ? error.message : OrganizationCreatePromptMessages.genericError;
        await session.baseInteraction.followUp({
            content: `Unable to create the organization: ${message}`,
            flags: MessageFlags.Ephemeral,
        });
    }
}
