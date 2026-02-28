import type { ButtonInteraction, ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import type { UserCreateFlowState } from '../../../Flow/Object/User/CreateState.js';
import {
    UserCreateControlService,
    UserCreateSessionStore,
    ExpireUserCreateSession,
    RefreshUserCreateSessionTimeout,
    type UserCreateSession,
} from './UserCreateControls/index.js';

const sessionStore = new UserCreateSessionStore();
const controlService = new UserCreateControlService(sessionStore);

/**
 * Register a new interactive user creation session
 * @param options Object describing the initiating interaction and Discord message identifiers
 * @returns Promise_UserCreateSession Active session reference persisted in the store
 * @example const session = await RegisterUserCreateSession({ interaction, state, previewMessageId, controlsMessageId })
 */
export async function RegisterUserCreateSession(options: {
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    state: UserCreateFlowState;
    previewMessageId: string;
    controlsMessageId: string;
}): Promise<UserCreateSession> {
    const { interaction, state, previewMessageId, controlsMessageId } = options;
    const existing = sessionStore.getByUser(interaction.user.id);
    if (existing) {
        await ExpireUserCreateSession(
            sessionStore,
            existing,
            `A newer user creation session has replaced the previous one. Start again to continue.`,
        );
    }

    const session: UserCreateSession = {
        baseInteraction: interaction,
        state,
        previewMessageId,
        controlsMessageId,
        userId: interaction.user.id,
        expiresAt: Date.now(),
    };

    sessionStore.setSession(session);
    RefreshUserCreateSessionTimeout(sessionStore, session, ExpireUserCreateSession);
    return session;
}

/**
 * Process a button interaction emitted from the user creation controls
 * @param interaction ButtonInteraction Discord button interaction payload
 * @returns Promise_boolean True when the interaction was handled and false otherwise
 * @example const handled = await HandleUserCreateControlInteraction(interaction)
 */
export async function HandleUserCreateControlInteraction(interaction: ButtonInteraction): Promise<boolean> {
    return await controlService.handleInteraction(interaction);
}

/**
 * Retrieve the active session associated with a Discord user identifier
 * @param userId string Discord user identifier
 * @returns UserCreateSession or undefined The tracked session if one exists
 * @example const session = GetUserCreateSessionByUser('123')
 */
export function GetUserCreateSessionByUser(userId: string): UserCreateSession | undefined {
    return controlService.getSessionByUser(userId);
}

/**
 * Clear all tracked user creation sessions for administrative resets
 * @returns void
 * @example ResetUserCreateSessions()
 */
export function ResetUserCreateSessions(): void {
    controlService.resetSessions();
}

export type { UserCreateSession } from './UserCreateControls/UserCreateSessionStore.js';
