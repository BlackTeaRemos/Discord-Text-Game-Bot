import { MessageFlags, type ButtonInteraction } from 'discord.js';
import { GameCreateFlowConstants } from '../../../../Flow/Object/Game/CreateState.js';
import type { GameCreateSession } from './GameCreateSessionStore.js';
import { GameCreateSessionStore } from './GameCreateSessionStore.js';
import { ClearGameCreateSessionTimeout } from './ClearGameCreateSessionTimeout.js';
import { ExpireGameCreateSession } from './ExpireGameCreateSession.js';
import { CapitalizeValue } from './CapitalizeValue.js';
import { ResolveGameCreateFlowLabel } from './ResolveGameCreateFlowLabel.js';
import { HandleGameCreateChangeName } from './HandleGameCreateChangeName.js';
import { HandleGameCreateChangeDescription } from './HandleGameCreateChangeDescription.js';
import { HandleGameCreateChangeImage } from './HandleGameCreateChangeImage.js';
import { HandleGameCreateConfirmAction } from './HandleGameCreateConfirmAction.js';

/**
 * Handles button interactions for the game creation controls, delegating storage to the session store.
 */
export class GameCreateControlService {
    private readonly _store: GameCreateSessionStore;

    public constructor(store: GameCreateSessionStore) {
        this._store = store;
    }

    /**
     * Process a button interaction originating from the game creation controls.
     * @param interaction ButtonInteraction Discord button interaction to process. @example await service.handleInteraction(interaction)
     * @returns Promise<boolean> True if handled, false otherwise. @example const handled = await service.handleInteraction(interaction)
     * @example const handled = await service.handleInteraction(interaction);
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
                    content: `This game creation session is no longer active. Start the command again to make changes.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
            return true;
        }

        await interaction.deferUpdate();

        switch (interaction.customId) {
            case GameCreateFlowConstants.changeNameId:
                await HandleGameCreateChangeName({ session, store: this._store });
                return true;
            case GameCreateFlowConstants.changeDescriptionId:
                await HandleGameCreateChangeDescription({ session, store: this._store });
                return true;
            case GameCreateFlowConstants.changeImageId:
                await HandleGameCreateChangeImage({ session, store: this._store });
                return true;
            case GameCreateFlowConstants.cancelCreateId:
                await ExpireGameCreateSession(
                    this._store,
                    session,
                    `${CapitalizeValue(ResolveGameCreateFlowLabel(session.state))} cancelled. Run the command again to start over.`,
                );
                return true;
            case GameCreateFlowConstants.confirmCreateId:
                await HandleGameCreateConfirmAction({ session, store: this._store });
                return true;
            default:
                return false;
        }
    }

    /**
     * Locate the active session for a user identifier.
     * @param userId string Discord user identifier. @example const session = service.getSessionByUser('123')
     * @returns GameCreateSession | undefined Active session if present. @example const session = service.getSessionByUser('123')
     */
    public getSessionByUser(userId: string): GameCreateSession | undefined {
        return this._store.getByUser(userId);
    }

    /**
     * Reset the underlying store state.
     * @returns void Clears internal indexes. @example service.resetSessions()
     */
    public resetSessions(): void {
        for (const session of this._store.reset()) {
            ClearGameCreateSessionTimeout(session);
        }
    }
}
