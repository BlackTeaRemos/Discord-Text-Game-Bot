import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import {
    type GameActionComponentMode,
    GAME_UPDATE_BUTTON_ID,
    GAME_REMOVE_BUTTON_ID,
    GAME_REMOVE_CONFIRM_ID,
    GAME_REMOVE_CANCEL_ID,
} from './Types.js';

/**
 * Build the action rows rendered below the game view embed based on the interaction state.
 * @param mode GameActionComponentMode Interaction state describing which controls to render.
 * @returns ActionRowBuilder<ButtonBuilder>[] Component rows to apply to the Discord message.
 * @example
 * const rows = buildGameActionRows('default');
 * const confirmRows = buildGameActionRows('remove_confirm');
 */
export function BuildGameActionRows(mode: GameActionComponentMode): ActionRowBuilder<ButtonBuilder>[] {
    if (mode === `remove_confirm`) {
        return [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(GAME_REMOVE_CONFIRM_ID)
                    .setLabel(`Confirm removal`)
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(GAME_REMOVE_CANCEL_ID)
                    .setLabel(`Cancel`)
                    .setStyle(ButtonStyle.Secondary),
            ),
        ];
    }

    const updateButton = new ButtonBuilder()
        .setCustomId(GAME_UPDATE_BUTTON_ID)
        .setLabel(mode === `editing` ? `Editing in progress` : `Edit game`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(mode === `editing` || mode === `inactive`);

    const removeButton = new ButtonBuilder()
        .setCustomId(GAME_REMOVE_BUTTON_ID)
        .setLabel(`Remove game`)
        .setStyle(ButtonStyle.Danger)
        .setDisabled(mode === `editing` || mode === `inactive`);

    return [new ActionRowBuilder<ButtonBuilder>().addComponents(updateButton, removeButton)];
}
