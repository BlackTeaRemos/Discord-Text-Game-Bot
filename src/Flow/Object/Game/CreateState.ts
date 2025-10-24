/**
 * Track runtime data for the interactive game creation flow.
 * @property serverId string Discord guild identifier hosting the command. @example "123456789012345678"
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
 */
export interface GameCreateFlowState {
    serverId: string;
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
    imageBucket: `game-images`,
} as const;

