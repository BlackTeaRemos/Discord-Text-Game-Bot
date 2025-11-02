/**
 * Track runtime data for the interactive game creation flow.
 * @property serverId string Discord guild identifier hosting the command. @example "123456789012345678"
 * @property mode 'create' | 'update' Indicates whether the flow is creating or updating a game. @example 'create'
 * @property defaultName string | undefined Optional prefilled name for the upcoming game. @example "Galaxy League"
 * @property organizationUid string | undefined Organization scope responsible for the game. @example "org_1"
 * @property organizationName string | undefined Human readable organization name. @example "Galactic Federation"
 * @property gameName string Current working game title. @example "Galaxy League"
 * @property description string Current working game description. @example "A cross-server tournament"
 * @property imageUrl string | undefined Selected preview image URL. @example "https://cdn.example/game.png"
 * @property previewMessageId string | undefined Discord message id used for the preview embed. @example "1122334455"
 * @property controlsMessageId string | undefined Discord message id used for button controls. @example "6677889900"
 * @property awaitingName boolean | undefined Indicates the flow expects next message to contain game name. @example true
 * @property awaitingDescription boolean | undefined Indicates the flow expects next message to contain description. @example false
 * @property awaitingImage boolean | undefined Indicates the flow expects next message to provide image content. @example false
 * @property uploadInProgress boolean | undefined True while an attachment upload is underway. @example true
 * @property controlsLocked boolean | undefined Indicates the controls are disabled because the session ended. @example true
 * @property finalizing boolean | undefined True while the game workflow is persisting data. @example true
 * @property gameUid string | undefined Identifier of the game when updating. @example "game_123"
 * @property originalName string | undefined Original game title prior to updates. @example "Galaxy League"
 * @property originalDescription string | undefined Original description before changes. @example "Season overview"
 * @property originalImageUrl string | undefined Original image URL before changes. @example "https://cdn.example/game.png"
 * @property ownerDiscordId string | undefined Discord id of the user controlling the flow. @example "123456789012345678"
 */
export interface GameCreateFlowState {
    serverId: string;
    mode: `create` | `update`;
    defaultName?: string;
    organizationUid?: string;
    organizationName?: string;
    gameName: string;
    description: string;
    imageUrl?: string;
    previewMessageId?: string;
    controlsMessageId?: string;
    awaitingName?: boolean;
    awaitingDescription?: boolean;
    awaitingImage?: boolean;
    uploadInProgress?: boolean;
    controlsLocked?: boolean;
    finalizing?: boolean;
    gameUid?: string;
    originalName?: string;
    originalDescription?: string;
    originalImageUrl?: string;
    ownerDiscordId?: string;
}

/**
 * Shared configuration constants for the game creation flow.
 */
export const GameCreateFlowConstants = {
    logSource: `Flow/Object/Game/Create`,
    changeNameId: `game_create_change_name`,
    changeDescriptionId: `game_create_change_description`,
    changeImageId: `game_create_change_image`,
    confirmCreateId: `game_create_confirm`,
    cancelCreateId: `game_create_cancel`,
    selectOrganizationId: `game_create_select_org`,
    defaultImageUrl: `https://via.placeholder.com/512x288.png?text=Game+Preview`,
    controlsTimeoutMs: 5 * 60 * 1000,
} as const;
