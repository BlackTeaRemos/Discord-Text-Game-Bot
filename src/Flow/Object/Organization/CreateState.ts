import { sanitizeDescriptionText } from '../Description/BuildDefinition.js';

/**
 * Track runtime data for the interactive organization creation flow.
 * @property ownerDiscordId string Discord identifier of the user driving the flow. @example "123456789012345678"
 * @property organizationName string Working organization name. @example "Alpha Division"
 * @property friendlyName string Human friendly name presented in embeds. @example "Alpha"
 * @property description string Long form description presented on views. @example "Founded to manage seasonal leagues."
 * @property previewMessageId string | undefined Discord message identifier of the preview embed. @example "1122334455"
 * @property controlsMessageId string | undefined Discord message identifier of the control panel. @example "5566778899"
 * @property awaitingName boolean | undefined Indicates the flow awaits a name response. @example true
 * @property awaitingFriendlyName boolean | undefined Indicates the flow awaits a friendly name response. @example false
 * @property awaitingDescription boolean | undefined Indicates the flow awaits a description response. @example true
 * @property controlsLocked boolean | undefined True when the control panel is disabled. @example true
 * @property finalizing boolean | undefined True while the flow persists the organization. @example true
 */
export interface OrganizationCreateFlowState {
    ownerDiscordId: string;
    organizationName: string;
    friendlyName: string;
    description: string;
    previewMessageId?: string;
    controlsMessageId?: string;
    awaitingName?: boolean;
    awaitingFriendlyName?: boolean;
    awaitingDescription?: boolean;
    controlsLocked?: boolean;
    finalizing?: boolean;
}

/**
 * Shared configuration constants for the organization creation flow.
 */
export const OrganizationCreateFlowConstants = {
    logSource: `Flow/Object/Organization/Create`,
    changeNameId: `org_create_change_name`,
    changeFriendlyNameId: `org_create_change_friendly`,
    changeDescriptionId: `org_create_change_description`,
    confirmCreateId: `org_create_confirm`,
    cancelCreateId: `org_create_cancel`,
    controlsTimeoutMs: 3 * 60 * 1000,
} as const;

/**
 * Build the initial state backing the organization creation flow.
 * @param options Object containing the Discord user identifier launching the flow. @example createOrganizationCreateState({ ownerDiscordId: '123' })
 * @returns OrganizationCreateFlowState Initialized state with default values.
 */
export function createOrganizationCreateState(options: { ownerDiscordId: string }): OrganizationCreateFlowState {
    const defaultName = `New organization`;
    const defaultDescription = sanitizeDescriptionText(`No description provided yet.`);
    return {
        ownerDiscordId: options.ownerDiscordId,
        organizationName: defaultName,
        friendlyName: defaultName,
        description: defaultDescription,
        controlsLocked: false,
        finalizing: false,
    };
}
