import type { GameActionContext, GameActionComponentMode } from './Types.js';
import { BuildGameActionRows } from './GameActionRows.js';
import { log } from '../../Common/Log.js';

/** Storage for game action contexts keyed by message ID. */
const _gameActionContextByMessage = new Map<string, GameActionContext>();

/** Retention window for contexts in milliseconds (10 minutes). */
const CONTEXT_RETENTION_MS = 10 * 60 * 1000;

/**
 * Remove stale contexts older than the configured retention window.
 * Called automatically during registration to avoid accumulating idle references.
 * @returns void
 */
function PruneExpiredContexts(): void {
    const expiration = Date.now() - CONTEXT_RETENTION_MS;
    for (const [messageId, context] of _gameActionContextByMessage.entries()) {
        if (context.registeredAt < expiration) {
            _gameActionContextByMessage.delete(messageId);
        }
    }
}

/**
 * Track the context for a specific game action message.
 * Subsequent button presses can retrieve this context to resolve the original interaction.
 * @param messageId string Discord message identifier keyed in the context map.
 * @param context GameActionContext Payload describing the interaction source.
 * @returns void
 * @example
 * RegisterGameActionContext('123456789', { interaction, gameUid: 'game_1', registeredAt: Date.now() });
 */
export function RegisterGameActionContext(messageId: string, context: GameActionContext): void {
    PruneExpiredContexts();
    _gameActionContextByMessage.set(messageId, context);
}

/**
 * Retrieve the stored context for a message, if any.
 * @param messageId string Discord message identifier.
 * @returns GameActionContext | undefined The stored context or undefined if not found/expired.
 * @example
 * const ctx = GetGameActionContext('123456789');
 */
export function GetGameActionContext(messageId: string): GameActionContext | undefined {
    return _gameActionContextByMessage.get(messageId);
}

/**
 * Remove a context from storage after it has been consumed.
 * @param messageId string Discord message identifier.
 * @returns void
 */
export function DeleteGameActionContext(messageId: string): void {
    _gameActionContextByMessage.delete(messageId);
}

/**
 * Apply the correct button layout to the tracked message for the supplied mode.
 * @param context GameActionContext Interaction context containing the webhook reference.
 * @param messageId string Discord message identifier whose components should update.
 * @param mode GameActionComponentMode Interaction state describing the component layout.
 * @returns Promise<void> Resolves once the message edit is attempted.
 * @example
 * await UpdateGameActionComponents(ctx, '123456789', 'default');
 */
export async function UpdateGameActionComponents(
    context: GameActionContext,
    messageId: string,
    mode: GameActionComponentMode,
): Promise<void> {
    try {
        await context.interaction.webhook.editMessage(messageId, {
            components: BuildGameActionRows(mode),
        });
    } catch(error) {
        log.warning(
            `Failed to update game action controls for ${messageId}: ${String(error)}`,
            `ViewCommand`,
            `UpdateGameActionComponents`,
        );
    }
}

/**
 * Testing utilities for game action context management.
 */
export const __gameActionContextTesting = {
    getContext: GetGameActionContext,
    reset: (): void => {
        _gameActionContextByMessage.clear();
    },
};
