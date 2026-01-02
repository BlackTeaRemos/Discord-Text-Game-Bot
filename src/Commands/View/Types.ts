import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';

/**
 * Internal state tracked throughout the view command flow.
 * @property type string | undefined Selected object type (example: 'game').
 * @property id string | undefined Selected object identifier (example: 'game_123').
 * @property orgUid string | undefined Organization context for descriptions (example: 'org_456').
 * @property orgName string | undefined Display name of selected organization (example: 'Acme Corp').
 */
export interface ViewFlowState {
    type?: string;
    id?: string;
    orgUid?: string;
    orgName?: string;
}

/**
 * Context stored for game action buttons to resolve subsequent interactions.
 * @property interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Original command interaction.
 * @property gameUid string Game identifier being acted upon (example: 'game_123').
 * @property orgUid string | undefined Organization context (example: 'org_456').
 * @property orgName string | undefined Organization display name (example: 'Acme Corp').
 * @property registeredAt number Timestamp when context was registered (example: 1700000000000).
 * @property pendingRemoval boolean | undefined Whether removal confirmation is pending (example: true).
 */
export interface GameActionContext {
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    gameUid: string;
    orgUid?: string;
    orgName?: string;
    registeredAt: number;
    pendingRemoval?: boolean;
}

/**
 * Describes the visual state of game action buttons.
 * - 'default': Normal interactive state
 * - 'editing': Edit in progress, buttons disabled
 * - 'remove_confirm': Showing confirmation buttons
 * - 'inactive': All buttons disabled
 */
export type GameActionComponentMode = `default` | `editing` | `remove_confirm` | `inactive`;

/** Button ID for starting game update flow. */
export const GAME_UPDATE_BUTTON_ID = `view_game_update_start`;

/** Button ID for initiating game removal. */
export const GAME_REMOVE_BUTTON_ID = `view_game_remove_start`;

/** Button ID for confirming game removal. */
export const GAME_REMOVE_CONFIRM_ID = `view_game_remove_confirm`;

/** Button ID for canceling game removal. */
export const GAME_REMOVE_CANCEL_ID = `view_game_remove_cancel`;

/** Set of all game action button identifiers for quick lookup. */
export const GAME_ACTION_BUTTON_IDS = new Set([
    GAME_UPDATE_BUTTON_ID,
    GAME_REMOVE_BUTTON_ID,
    GAME_REMOVE_CONFIRM_ID,
    GAME_REMOVE_CANCEL_ID,
]);
