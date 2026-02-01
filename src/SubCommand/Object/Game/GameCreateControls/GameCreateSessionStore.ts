import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import type { GameCreateFlowState } from '../../../../Flow/Object/Game/CreateState.js';

/**
 * Active session maintained while a user configures a game through the interactive controls.
 * @property baseInteraction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Slash command interaction used for follow-up messages. @example session.baseInteraction.webhook.editMessage(id, payload)
 * @property state GameCreateFlowState Mutable flow state reflected by the controls. @example session.state.gameName
 * @property previewMessageId string Discord message identifier for the preview embed. @example '1234567890'
 * @property controlsMessageId string Discord message identifier for the buttons. @example '0987654321'
 * @property userId string Discord user identifier owning the session. @example '123456789012345678'
 * @property timeoutHandle NodeJS.Timeout | undefined Scheduled timeout handle created for inactivity. @example session.timeoutHandle
 * @property expiresAt number Epoch timestamp describing when the session will time out. @example Date.now()
 */
export interface GameCreateSession {
    baseInteraction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    state: GameCreateFlowState;
    previewMessageId: string;
    controlsMessageId: string;
    userId: string;
    timeoutHandle?: NodeJS.Timeout;
    expiresAt: number;
}

/**
 * Provides indexed access to active game creation sessions.
 */
export class GameCreateSessionStore {
    private readonly sessionsByControlMessage = new Map<string, GameCreateSession>();
    private readonly sessionsByUser = new Map<string, GameCreateSession>();

    /**
     * Persist a session reference in the lookup indexes.
     * @param session GameCreateSession Session to store. @example store.setSession(session)
     * @returns void
     */
    public setSession(session: GameCreateSession): void {
        this.sessionsByControlMessage.set(session.controlsMessageId, session);
        this.sessionsByUser.set(session.userId, session);
    }

    /**
     * Retrieve a session by its controls message identifier.
     * @param controlMessageId string Discord message identifier. @example const session = store.getByControlMessage(id)
     * @returns GameCreateSession | undefined Matched session if present. @example const found = store.getByControlMessage(id)
     */
    public getByControlMessage(controlMessageId: string): GameCreateSession | undefined {
        return this.sessionsByControlMessage.get(controlMessageId);
    }

    /**
     * Retrieve a session tracked against the supplied user identifier.
     * @param userId string Discord user identifier. @example const session = store.getByUser(userId)
     * @returns GameCreateSession | undefined Active session if tracked. @example const session = store.getByUser('123')
     */
    public getByUser(userId: string): GameCreateSession | undefined {
        return this.sessionsByUser.get(userId);
    }

    /**
     * Remove the provided session from the lookup indexes.
     * @param session GameCreateSession Session previously stored. @example store.deleteSession(session)
     * @returns void
     */
    public deleteSession(session: GameCreateSession): void {
        this.sessionsByControlMessage.delete(session.controlsMessageId);
        this.sessionsByUser.delete(session.userId);
    }

    /**
     * Clear all tracked sessions.
     * @returns GameCreateSession[] Array of sessions removed from storage for further disposal. @example const removed = store.reset()
     */
    public reset(): GameCreateSession[] {
        const sessions: GameCreateSession[] = Array.from(this.sessionsByControlMessage.values());
        this.sessionsByControlMessage.clear();
        this.sessionsByUser.clear();
        return sessions;
    }
}
