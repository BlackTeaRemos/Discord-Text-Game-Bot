import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import type { OrganizationCreateFlowState } from '../../../../Flow/Object/Organization/CreateState.js';

/**
 * Active session maintained while a user configures an organization via interactive controls.
 * @property baseInteraction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Slash command interaction used for follow-ups. @example session.baseInteraction.followUp(payload)
 * @property state OrganizationCreateFlowState Mutable flow state. @example session.state.organizationName
 * @property previewMessageId string Discord message identifier of the preview embed. @example '1122334455'
 * @property controlsMessageId string Discord message identifier of the control panel. @example '5566778899'
 * @property userId string Discord user identifier owning the session. @example '123456789012345678'
 * @property timeoutHandle NodeJS.Timeout | undefined Pending timeout used to expire idle sessions. @example session.timeoutHandle
 * @property expiresAt number Epoch timestamp describing when the session will expire. @example Date.now()
 */
export interface OrganizationCreateSession {
    baseInteraction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    state: OrganizationCreateFlowState;
    previewMessageId: string;
    controlsMessageId: string;
    userId: string;
    timeoutHandle?: NodeJS.Timeout;
    expiresAt: number;
}

/**
 * Provides indexed access to organization creation sessions.
 */
export class OrganizationCreateSessionStore {
    private readonly sessionsByControlMessage = new Map<string, OrganizationCreateSession>();
    private readonly sessionsByUser = new Map<string, OrganizationCreateSession>();

    /**
     * Persist a session reference in the lookup indexes.
     * @param session OrganizationCreateSession Session to store. @example store.setSession(session)
     * @returns void Nothing.
     */
    public setSession(session: OrganizationCreateSession): void {
        this.sessionsByControlMessage.set(session.controlsMessageId, session);
        this.sessionsByUser.set(session.userId, session);
    }

    /**
     * Retrieve a session by the control message identifier.
     * @param controlMessageId string Discord message identifier. @example store.getByControlMessage(id)
     * @returns OrganizationCreateSession | undefined Session when present; otherwise undefined.
     */
    public getByControlMessage(controlMessageId: string): OrganizationCreateSession | undefined {
        return this.sessionsByControlMessage.get(controlMessageId);
    }

    /**
     * Retrieve a session by Discord user identifier.
     * @param userId string Discord user identifier. @example store.getByUser('123')
     * @returns OrganizationCreateSession | undefined Session when tracked; otherwise undefined.
     */
    public getByUser(userId: string): OrganizationCreateSession | undefined {
        return this.sessionsByUser.get(userId);
    }

    /**
     * Remove a session from the store.
     * @param session OrganizationCreateSession Session previously cached. @example store.deleteSession(session)
     * @returns void Nothing.
     */
    public deleteSession(session: OrganizationCreateSession): void {
        this.sessionsByControlMessage.delete(session.controlsMessageId);
        this.sessionsByUser.delete(session.userId);
    }

    /**
     * Clear the tracked sessions returning removed entries.
     * @returns OrganizationCreateSession[] Array of sessions removed from the store. @example const removed = store.reset()
     */
    public reset(): OrganizationCreateSession[] {
        const sessions = Array.from(this.sessionsByControlMessage.values());
        this.sessionsByControlMessage.clear();
        this.sessionsByUser.clear();
        return sessions;
    }
}
