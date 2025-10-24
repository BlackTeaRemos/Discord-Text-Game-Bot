import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { GameCreateFlowState } from '../../../../Flow/Object/Game/CreateState.js';
import { GameCreateFlowConstants } from '../../../../Flow/Object/Game/CreateState.js';

/**
 * Create the action rows representing the control buttons for the flow.
 * @param state GameCreateFlowState Mutable flow state. @example BuildControlRows(state)
 * @returns ActionRowBuilder<ButtonBuilder>[] Button rows representing UI controls.
 */
export function BuildControlRows(state: GameCreateFlowState): ActionRowBuilder<ButtonBuilder>[] {
    const primaryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.changeNameId)
            .setLabel(`Change name`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(Boolean(state.awaitingName) || state.uploadInProgress === true),
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.changeDescriptionId)
            .setLabel(`Change description`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(Boolean(state.awaitingDescription) || state.uploadInProgress === true),
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.changeImageId)
            .setLabel(`Change image`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(Boolean(state.awaitingImage) || state.uploadInProgress === true),
    );

    const secondaryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.confirmCreateId)
            .setLabel(`Create game`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(!state.gameName?.trim() || state.uploadInProgress === true),
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.cancelCreateId)
            .setLabel(`Cancel`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(state.uploadInProgress === true),
    );

    return [primaryRow, secondaryRow];
}
