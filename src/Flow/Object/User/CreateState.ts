import { sanitizeDescriptionText } from '../Description/BuildDefinition.js';

/**
 * Track runtime data for the interactive user creation flow.
 * @property ownerDiscordId string Discord identifier of the user driving the flow. @example "123456789012345678"
 * @property discordId string Working Discord identifier for the user being registered. @example "234567890123456789"
 * @property displayName string Display name rendered on embeds. @example "Jamie"
 * @property friendlyName string Friendly alias used in compact listings. @example "Operator Jamie"
 * @property description string Narrative profile shown on views. @example "Organizes weekly runs."
 * @property previewMessageId string | undefined Identifier of the preview message. @example "1122334455"
 * @property controlsMessageId string | undefined Identifier of the controls message. @example "5566778899"
 * @property awaitingDiscordId boolean | undefined Indicates whether the flow awaits a Discord ID response. @example true
 * @property awaitingDisplayName boolean | undefined Indicates whether the flow awaits a display name response. @example false
 * @property awaitingFriendlyName boolean | undefined Indicates whether the flow awaits a friendly name response. @example false
 * @property awaitingDescription boolean | undefined Indicates whether the flow awaits a description response. @example false
 * @property controlsLocked boolean | undefined True when the control panel is disabled. @example true
 * @property finalizing boolean | undefined True while persisting the user to storage. @example true
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
 * Shared configuration constants for the user creation interactive flow.
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
 * Build the initial state backing the user creation flow.
 * @param options Object containing the Discord identifier of the initiating user. @example createUserCreateState({ ownerDiscordId: '123' })
 * @returns UserCreateFlowState Initialized flow state instance. @example const state = createUserCreateState({ ownerDiscordId: '123' })
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
