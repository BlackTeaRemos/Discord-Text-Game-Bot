import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { ObjectTypeKey } from '../../Common/Flow/ObjectRegistry.js';
import { BuildViewParameterButtonId } from './ParameterActionId.js';

/**
 * Build the parameter action row for a viewed object.
 * @param type ObjectTypeKey View object type key. @example 'game'
 * @param id string Object identifier. @example 'game_123'
 * @returns ActionRowBuilder<ButtonBuilder>[] Component rows to apply to the message.
 */
export function BuildParameterActionRows(
    type: ObjectTypeKey,
    id: string,
): ActionRowBuilder<ButtonBuilder>[] {
    const button = new ButtonBuilder()
        .setCustomId(BuildViewParameterButtonId(type, id))
        .setLabel(`View parameters`)
        .setStyle(ButtonStyle.Secondary);

    return [new ActionRowBuilder<ButtonBuilder>().addComponents(button)];
}
