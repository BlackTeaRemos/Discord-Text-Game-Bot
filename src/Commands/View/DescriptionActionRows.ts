import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { ObjectTypeKey } from '../../Common/Flow/ObjectRegistry.js';

/** Button ID prefix used for view description edit controls. */
export const VIEW_DESCRIPTION_EDIT_BUTTON_ID = `view_description_edit`;

/**
 * Build the description action row for a viewed object.
 * @param type ObjectTypeKey View object type key. @example 'game'
 * @param id string Object identifier. @example 'game_123'
 * @returns ActionRowBuilder<ButtonBuilder>[] Component rows to apply to the message.
 */
export function BuildDescriptionActionRows(
    type: ObjectTypeKey,
    id: string,
): ActionRowBuilder<ButtonBuilder>[] {
    const customId = `${VIEW_DESCRIPTION_EDIT_BUTTON_ID}:${type}:${id}`;
    if (customId.length > 100) {
        throw new Error(`Description action customId is too long (${customId.length}).`);
    }

    const button = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(`Edit description`)
        .setStyle(ButtonStyle.Secondary);

    return [new ActionRowBuilder<ButtonBuilder>().addComponents(button)];
}
