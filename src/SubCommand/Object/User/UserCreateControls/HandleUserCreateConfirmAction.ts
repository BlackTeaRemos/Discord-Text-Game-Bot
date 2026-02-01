import { MessageFlags } from 'discord.js';
import { CreateUser } from '../../../../Flow/Object/User/Create.js';
import { sanitizeDescriptionText } from '../../../../Flow/Object/Description/BuildDefinition.js';
import { SaveScopedDescription } from '../../../../Flow/Object/Description/Scope/SaveScopedDescription.js';
import { UserCreateFlowConstants } from '../../../../Flow/Object/User/CreateState.js';
import type { UserCreateSession } from './UserCreateSessionStore.js';
import type { UserCreateSessionStore } from './UserCreateSessionStore.js';
import { ClearUserCreateSessionTimeout } from './ClearUserCreateSessionTimeout.js';
import { RefreshUserCreateSessionTimeout } from './RefreshUserCreateSessionTimeout.js';
import { ExpireUserCreateSession } from './ExpireUserCreateSession.js';
import { UpdateUserCreateSessionControls } from './UserCreateSessionRenderer.js';
import { UserCreatePromptMessages } from './UserCreatePromptMessages.js';

export interface HandleUserCreateConfirmActionOptions {
    /**
     * Session capturing mutable flow state.
     */
    session: UserCreateSession;
    /**
     * Session store used to refresh inactivity timers.
     */
    store: UserCreateSessionStore;
}

/**
 * Persist the user using the configured flow state.
 * @param options HandleUserCreateConfirmActionOptions Handler configuration. @example await HandleUserCreateConfirmAction({ session, store })
 * @returns Promise<void> Resolves after persistence completes or fails. @example await HandleUserCreateConfirmAction({ session, store })
 */
export async function HandleUserCreateConfirmAction(options: HandleUserCreateConfirmActionOptions): Promise<void> {
    const { session, store } = options;
    ClearUserCreateSessionTimeout(session);
    session.state.finalizing = true;
    await UpdateUserCreateSessionControls(session);

    try {
        const trimmedId = session.state.discordId.trim();
        if (!/^\d{15,25}$/.test(trimmedId)) {
            session.state.finalizing = false;
            await UpdateUserCreateSessionControls(session);
            RefreshUserCreateSessionTimeout(store, session, ExpireUserCreateSession);
            await session.baseInteraction.followUp({
                content: `Set a Discord user ID between 15 and 25 digits before continuing.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const displayName = session.state.displayName.trim() || undefined;
        const friendlyName = session.state.friendlyName.trim() || undefined;
        const imageUrl = session.state.imageUrl?.trim() || UserCreateFlowConstants.defaultImageUrl;

        const created = await CreateUser({
            discordId: trimmedId,
            name: displayName,
            friendlyName,
            imageUrl,
        });

        const descriptionText = sanitizeDescriptionText(session.state.description);
        await SaveScopedDescription({
            objectType: `user`,
            objectUid: created.uid,
            scope: {
                scopeType: `global`,
                scopeUid: null,
                label: `Official Description`,
            },
            content: descriptionText,
            createdBy: session.state.ownerDiscordId,
        });
        await ExpireUserCreateSession(
            store,
            session,
            `User profile linked to Discord ${created.discord_id} created successfully.`,
        );
    } catch(error) {
        session.state.finalizing = false;
        await UpdateUserCreateSessionControls(session);
        RefreshUserCreateSessionTimeout(store, session, ExpireUserCreateSession);
        const message = error instanceof Error ? error.message : UserCreatePromptMessages.genericError;
        await session.baseInteraction.followUp({
            content: `Unable to create the user: ${message}`,
            flags: MessageFlags.Ephemeral,
        });
    }
}
