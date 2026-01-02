import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import type { UserCreateFlowState } from '../../../../Flow/Object/User/CreateState.js';

/**
 * Active session maintained while a user configures a user entry via interactive controls.
 * @property baseInteraction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Slash command interaction used for follow-ups. @example session.baseInteraction.followUp(payload)
 * @property state UserCreateFlowState Mutable flow state. @example session.state.discordId
 * @property previewMessageId string Discord message identifier of the preview embed. @example '1122334455'
 * @property controlsMessageId string Discord message identifier of the control panel. @example '5566778899'
 * @property userId string Discord user identifier owning the session. @example '123456789012345678'
 * @property timeoutHandle NodeJS.Timeout | undefined Pending timeout used to expire idle sessions. @example session.timeoutHandle
 * @property expiresAt number Epoch timestamp describing when the session will expire. @example Date.now()
 */
export interface UserCreateSession {
    baseInteraction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    state: UserCreateFlowState;
    previewMessageId: string;
    controlsMessageId: string;
    userId: string;
    timeoutHandle?: NodeJS.Timeout;
    expiresAt: number;
}

/**
 * Provides indexed access to user creation sessions.
 */
export class UserCreateSessionStore {
    private readonly sessionsByControlMessage = new Map<string, UserCreateSession>();
    private readonly sessionsByUser = new Map<string, UserCreateSession>();

    /**
     * Persist a session reference in the lookup indexes.
     * @param session UserCreateSession Session to store. @example store.setSession(session)
     * @returns void Nothing.
     */
    public setSession(session: UserCreateSession): void {
        this.sessionsByControlMessage.set(session.controlsMessageId, session);
        this.sessionsByUser.set(session.userId, session);
    }

    /**
     * Retrieve a session by the control message identifier.
     * @param controlMessageId string Discord message identifier. @example store.getByControlMessage(id)
     * @returns UserCreateSession | undefined Session when present; otherwise undefined.
     */
    public getByControlMessage(controlMessageId: string): UserCreateSession | undefined {
        return this.sessionsByControlMessage.get(controlMessageId);
    }

    /**
     * Retrieve a session by Discord user identifier.
     * @param userId string Discord user identifier. @example store.getByUser('123')
     * @returns UserCreateSession | undefined Session when tracked; otherwise undefined.
     */
    public getByUser(userId: string): UserCreateSession | undefined {
        return this.sessionsByUser.get(userId);
    }

    /**
     * Remove a session from the store.
     * @param session UserCreateSession Session previously cached. @example store.deleteSession(session)
     * @returns void Nothing.
     */
    public deleteSession(session: UserCreateSession): void {
        this.sessionsByControlMessage.delete(session.controlsMessageId);
        this.sessionsByUser.delete(session.userId);
    }

    /**
     * Clear the tracked sessions returning removed entries.
     * @returns UserCreateSession[] Array of sessions removed from the store. @example const removed = store.reset()
     */
    public reset(): UserCreateSession[] {
        const sessions = Array.from(this.sessionsByControlMessage.values());
        this.sessionsByControlMessage.clear();
        this.sessionsByUser.clear();
        return sessions;
    }
}
