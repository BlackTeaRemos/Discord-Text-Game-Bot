import { MessageFlags, type ButtonInteraction } from 'discord.js';
import { OrganizationCreateFlowConstants } from '../../../../Flow/Object/Organization/CreateState.js';
import type { OrganizationCreateSession } from './OrganizationCreateSessionStore.js';
import { OrganizationCreateSessionStore } from './OrganizationCreateSessionStore.js';
import { ClearOrganizationCreateSessionTimeout } from './ClearOrganizationCreateSessionTimeout.js';
import { RefreshOrganizationCreateSessionTimeout } from './RefreshOrganizationCreateSessionTimeout.js';
import { ExpireOrganizationCreateSession } from './ExpireOrganizationCreateSession.js';
import { HandleOrganizationCreateChangeName } from './HandleOrganizationCreateChangeName.js';
import { HandleOrganizationCreateChangeFriendlyName } from './HandleOrganizationCreateChangeFriendlyName.js';
import { HandleOrganizationCreateChangeDescription } from './HandleOrganizationCreateChangeDescription.js';
import { HandleOrganizationCreateConfirmAction } from './HandleOrganizationCreateConfirmAction.js';

/**
 * Handles button interactions for the organization creation controls.
 */
export class OrganizationCreateControlService {
    private readonly _store: OrganizationCreateSessionStore;

    public constructor(store: OrganizationCreateSessionStore) {
        this._store = store;
    }

    /**
     * Process a button interaction originating from the organization creation controls.
     * @param interaction ButtonInteraction Discord button interaction to process. @example await service.handleInteraction(interaction)
     * @returns Promise<boolean> True if handled, false otherwise. @example const handled = await service.handleInteraction(interaction)
     */
    public async handleInteraction(interaction: ButtonInteraction): Promise<boolean> {
        const controlMessageId = interaction.message?.id;
        if (!controlMessageId) {
            return false;
        }

        const session = this._store.getByControlMessage(controlMessageId);
        if (!session) {
            return false;
        }

        if (session.state.controlsLocked) {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `This organization creation session is no longer active. Run the command again to make changes.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
            return true;
        }

        await interaction.deferUpdate();

        switch (interaction.customId) {
            case OrganizationCreateFlowConstants.changeNameId:
                await HandleOrganizationCreateChangeName({ session, store: this._store });
                return true;
            case OrganizationCreateFlowConstants.changeFriendlyNameId:
                await HandleOrganizationCreateChangeFriendlyName({ session, store: this._store });
                return true;
            case OrganizationCreateFlowConstants.changeDescriptionId:
                await HandleOrganizationCreateChangeDescription({ session, store: this._store });
                return true;
            case OrganizationCreateFlowConstants.cancelCreateId:
                await ExpireOrganizationCreateSession(
                    this._store,
                    session,
                    `Organization creation cancelled. Run the command again to start over.`,
                );
                return true;
            case OrganizationCreateFlowConstants.confirmCreateId:
                await HandleOrganizationCreateConfirmAction({ session, store: this._store });
                return true;
            default:
                return false;
        }
    }

    /**
     * Locate the active session for a user identifier.
     * @param userId string Discord user identifier. @example service.getSessionByUser('123')
     * @returns OrganizationCreateSession | undefined Active session if present.
     */
    public getSessionByUser(userId: string): OrganizationCreateSession | undefined {
        return this._store.getByUser(userId);
    }

    /**
     * Reset the underlying store state.
     * @returns void Clears internal indexes. @example service.resetSessions()
     */
    public resetSessions(): void {
        for (const session of this._store.reset()) {
            ClearOrganizationCreateSessionTimeout(session);
        }
    }
}
