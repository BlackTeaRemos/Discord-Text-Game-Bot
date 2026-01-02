import { MessageFlags, type ButtonInteraction } from 'discord.js';
import { UserCreateFlowConstants } from '../../../../Flow/Object/User/CreateState.js';
import type { UserCreateSession } from './UserCreateSessionStore.js';
import { UserCreateSessionStore } from './UserCreateSessionStore.js';
import { ClearUserCreateSessionTimeout } from './ClearUserCreateSessionTimeout.js';
import { RefreshUserCreateSessionTimeout } from './RefreshUserCreateSessionTimeout.js';
import { ExpireUserCreateSession } from './ExpireUserCreateSession.js';
import { HandleUserCreateChangeDiscordId } from './HandleUserCreateChangeDiscordId.js';
import { HandleUserCreateChangeDisplayName } from './HandleUserCreateChangeDisplayName.js';
import { HandleUserCreateChangeFriendlyName } from './HandleUserCreateChangeFriendlyName.js';
import { HandleUserCreateChangeDescription } from './HandleUserCreateChangeDescription.js';
import { HandleUserCreateConfirmAction } from './HandleUserCreateConfirmAction.js';

/**
 * Handles button interactions for the user creation controls.
 */
export class UserCreateControlService {
    private readonly _store: UserCreateSessionStore;

    public constructor(store: UserCreateSessionStore) {
        this._store = store;
    }

    /**
     * Process a button interaction originating from the user creation controls.
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
                    content: `This user creation session is no longer active. Run the command again to make changes.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
            return true;
        }

        await interaction.deferUpdate();

        switch (interaction.customId) {
            case UserCreateFlowConstants.changeDiscordId:
                await HandleUserCreateChangeDiscordId({ session, store: this._store });
                return true;
            case UserCreateFlowConstants.changeDisplayName:
                await HandleUserCreateChangeDisplayName({ session, store: this._store });
                return true;
            case UserCreateFlowConstants.changeFriendlyName:
                await HandleUserCreateChangeFriendlyName({ session, store: this._store });
                return true;
            case UserCreateFlowConstants.changeDescription:
                await HandleUserCreateChangeDescription({ session, store: this._store });
                return true;
            case UserCreateFlowConstants.cancelCreateId:
                await ExpireUserCreateSession(
                    this._store,
                    session,
                    `User creation cancelled. Run the command again to start over.`,
                );
                return true;
            case UserCreateFlowConstants.confirmCreateId:
                await HandleUserCreateConfirmAction({ session, store: this._store });
                return true;
            default:
                RefreshUserCreateSessionTimeout(this._store, session, ExpireUserCreateSession);
                return false;
        }
    }

    /**
     * Locate the active session for a user identifier.
     * @param userId string Discord user identifier. @example service.getSessionByUser('123')
     * @returns UserCreateSession | undefined Active session if present. @example const session = service.getSessionByUser('123')
     */
    public getSessionByUser(userId: string): UserCreateSession | undefined {
        return this._store.getByUser(userId);
    }

    /**
     * Reset the underlying store state.
     * @returns void Clears internal indexes. @example service.resetSessions()
     */
    public resetSessions(): void {
        for (const session of this._store.reset()) {
            ClearUserCreateSessionTimeout(session);
        }
    }
}
