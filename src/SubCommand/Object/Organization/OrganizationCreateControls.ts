import type { ButtonInteraction, ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import type { OrganizationCreateFlowState } from '../../../Flow/Object/Organization/CreateState.js';
import {
    OrganizationCreateControlService,
    OrganizationCreateSessionStore,
    ExpireOrganizationCreateSession,
    RefreshOrganizationCreateSessionTimeout,
    type OrganizationCreateSession,
} from './OrganizationCreateControls/index.js';

const sessionStore = new OrganizationCreateSessionStore();
const controlService = new OrganizationCreateControlService(sessionStore);

/**
 * Register a new interactive organization creation session.
 * @param options Object describing the initiating interaction and Discord message identifiers. @example await RegisterOrganizationCreateSession({ interaction, state, previewMessageId, controlsMessageId })
 * @returns Promise<OrganizationCreateSession> Active session reference persisted in the store. @example const session = await RegisterOrganizationCreateSession(options)
 */
export async function RegisterOrganizationCreateSession(options: {
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    state: OrganizationCreateFlowState;
    previewMessageId: string;
    controlsMessageId: string;
}): Promise<OrganizationCreateSession> {
    const { interaction, state, previewMessageId, controlsMessageId } = options;
    const existing = sessionStore.getByUser(interaction.user.id);
    if (existing) {
        await ExpireOrganizationCreateSession(
            sessionStore,
            existing,
            `A newer organization creation session has replaced the previous one. Start again to continue.`,
        );
    }

    const session: OrganizationCreateSession = {
        baseInteraction: interaction,
        state,
        previewMessageId,
        controlsMessageId,
        userId: interaction.user.id,
        expiresAt: Date.now(),
    };

    sessionStore.setSession(session);
    RefreshOrganizationCreateSessionTimeout(sessionStore, session, ExpireOrganizationCreateSession);
    return session;
}

/**
 * Process a button interaction emitted from the organization creation controls.
 * @param interaction ButtonInteraction Discord button interaction payload. @example const handled = await HandleOrganizationCreateControlInteraction(interaction)
 * @returns Promise<boolean> True when the interaction was handled; otherwise false to allow other handlers. @example if (await HandleOrganizationCreateControlInteraction(interaction)) return
 */
export async function HandleOrganizationCreateControlInteraction(interaction: ButtonInteraction): Promise<boolean> {
    return await controlService.handleInteraction(interaction);
}

/**
 * Retrieve the active session associated with a Discord user identifier.
 * @param userId string Discord user identifier. @example const session = GetOrganizationCreateSessionByUser('123')
 * @returns OrganizationCreateSession | undefined The tracked session, if one exists. @example const existing = GetOrganizationCreateSessionByUser(userId)
 */
export function GetOrganizationCreateSessionByUser(userId: string): OrganizationCreateSession | undefined {
    return controlService.getSessionByUser(userId);
}

/**
 * Clear all tracked organization creation sessions. Intended for administrative resets.
 * @returns void Nothing.
 */
export function ResetOrganizationCreateSessions(): void {
    controlService.resetSessions();
}

export type { OrganizationCreateSession } from './OrganizationCreateControls/OrganizationCreateSessionStore.js';
