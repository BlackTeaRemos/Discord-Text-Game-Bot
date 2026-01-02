import { MessageFlags } from 'discord.js';
import type { ButtonInteraction } from 'discord.js';
import {
    GAME_ACTION_BUTTON_IDS,
    GAME_UPDATE_BUTTON_ID,
    GAME_REMOVE_BUTTON_ID,
    GAME_REMOVE_CONFIRM_ID,
    GAME_REMOVE_CANCEL_ID,
} from './Types.js';
import {
    GetGameActionContext,
    DeleteGameActionContext,
    RegisterGameActionContext,
    UpdateGameActionComponents,
} from './GameActionContext.js';
import { StartGameUpdateFlow } from './GameUpdateFlow.js';
import { RemoveGame } from '../../Flow/Object/Game/Remove.js';
import { log } from '../../Common/Log.js';

/**
 * Process button interactions emitted from the view command's game controls.
 * Handles update, remove, confirm, and cancel actions.
 * @param interaction ButtonInteraction Discord button interaction triggered by the user.
 * @returns Promise<boolean> True when handled; otherwise false so other handlers may process it.
 * @example
 * const handled = await HandleViewGameActionInteraction(interaction);
 */
export async function HandleViewGameActionInteraction(interaction: ButtonInteraction): Promise<boolean> {
    const messageId = interaction.message?.id;
    if (!messageId) {
        return false;
    }

    if (!GAME_ACTION_BUTTON_IDS.has(interaction.customId)) {
        return false;
    }

    const context = GetGameActionContext(messageId);
    if (!context) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({
                content: `This control is no longer active. Run /view again to start a new session.`,
                flags: MessageFlags.Ephemeral,
            });
        }
        return true;
    }

    switch (interaction.customId) {
        case GAME_UPDATE_BUTTON_ID: {
            DeleteGameActionContext(messageId);
            try {
                await interaction.deferUpdate();
            } catch {
                // Ignore defer failures
            }
            await UpdateGameActionComponents(context, messageId, `editing`);
            await StartGameUpdateFlow(context);
            return true;
        }

        case GAME_REMOVE_BUTTON_ID: {
            context.pendingRemoval = true;
            try {
                await interaction.deferUpdate();
            } catch {
                // Ignore defer failures
            }
            await UpdateGameActionComponents(context, messageId, `remove_confirm`);
            return true;
        }

        case GAME_REMOVE_CANCEL_ID: {
            context.pendingRemoval = false;
            try {
                await interaction.deferUpdate();
            } catch {
                // Ignore defer failures
            }
            await UpdateGameActionComponents(context, messageId, `default`);
            return true;
        }

        case GAME_REMOVE_CONFIRM_ID: {
            return await HandleRemoveConfirmation(interaction, messageId, context);
        }

        default:
            return false;
    }
}

/**
 * Handle the game removal confirmation flow.
 * @param interaction ButtonInteraction The button interaction.
 * @param messageId string The message ID containing the buttons.
 * @param context GameActionContext The stored context for this interaction.
 * @returns Promise<boolean> Always returns true after handling.
 */
async function HandleRemoveConfirmation(
    interaction: ButtonInteraction,
    messageId: string,
    context: ReturnType<typeof GetGameActionContext> & object,
): Promise<boolean> {
    context.pendingRemoval = false;
    DeleteGameActionContext(messageId);

    try {
        await interaction.deferUpdate();
    } catch {
        // Ignore defer failures
    }

    const restoreContextOnFailure = async(): Promise<void> => {
        RegisterGameActionContext(messageId, context);
        await UpdateGameActionComponents(context, messageId, `default`);
    };

    try {
        await UpdateGameActionComponents(context, messageId, `inactive`);
        const removed = await RemoveGame(context.gameUid);

        if (!removed) {
            await restoreContextOnFailure();
            await context.interaction.followUp({
                content: `The selected game was not found or may have been removed already.`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        await context.interaction.followUp({
            content: `Game removed.`,
            flags: MessageFlags.Ephemeral,
        });
        return true;
    } catch(error) {
        log.error(`Failed to remove game ${context.gameUid}: ${String(error)}`, `ViewCommand`, `HandleRemoveConfirmation`);
        await restoreContextOnFailure();
        await context.interaction.followUp({
            content: `Unable to remove the game due to an unexpected error.`,
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }
}
