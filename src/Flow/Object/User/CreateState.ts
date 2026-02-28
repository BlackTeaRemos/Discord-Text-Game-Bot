import { sanitizeDescriptionText } from '../Description/BuildDefinition.js';

/**
 * Track runtime data for the interactive user creation flow
 */
export interface UserCreateFlowState {
    ownerDiscordId: string;
    discordId: string;
    displayName: string;
    friendlyName: string;
    description: string;
    imageUrl: string;
    previewMessageId?: string;
    controlsMessageId?: string;
    awaitingDiscordId?: boolean;
    awaitingDisplayName?: boolean;
    awaitingFriendlyName?: boolean;
    awaitingDescription?: boolean;
    controlsLocked?: boolean;
    finalizing?: boolean;
}

/**
 * Shared configuration constants for the user creation interactive flow
 */
export const UserCreateFlowConstants = {
    logSource: `Flow/Object/User/Create`,
    changeDiscordId: `user_create_change_discord`,
    changeDisplayName: `user_create_change_display`,
    changeFriendlyName: `user_create_change_friendly`,
    changeDescription: `user_create_change_description`,
    defaultImageUrl: `https://via.placeholder.com/512x288.png?text=User+Profile`,
    confirmCreateId: `user_create_confirm`,
    cancelCreateId: `user_create_cancel`,
    controlsTimeoutMs: 3 * 60 * 1000,
} as const;

/**
 * Build the initial state backing the user creation flow
 * @param options Object containing the Discord identifier of the initiating user @example createUserCreateState({ ownerDiscordId: '123' })
 * @returns UserCreateFlowState Initialized flow state instance @example const state = createUserCreateState({ ownerDiscordId: '123' })
 */
export function createUserCreateState(options: { ownerDiscordId: string }): UserCreateFlowState {
    const defaultName = `New user`;
    const defaultDescription = sanitizeDescriptionText(`No description provided yet.`);
    return {
        ownerDiscordId: options.ownerDiscordId,
        discordId: ``,
        displayName: defaultName,
        friendlyName: defaultName,
        description: defaultDescription,
        imageUrl: UserCreateFlowConstants.defaultImageUrl,
        controlsLocked: false,
        finalizing: false,
    };
}
