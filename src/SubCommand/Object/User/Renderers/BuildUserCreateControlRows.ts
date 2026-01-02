import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { UserCreateFlowState } from '../../../../Flow/Object/User/CreateState.js';
import { UserCreateFlowConstants } from '../../../../Flow/Object/User/CreateState.js';

/**
 * Create the action rows representing the control buttons for the flow.
 * @param state UserCreateFlowState Mutable flow state. @example BuildUserCreateControlRows(state)
 * @returns ActionRowBuilder<ButtonBuilder>[] Button rows representing UI controls. @example const rows = BuildUserCreateControlRows(state)
 */
export function BuildUserCreateControlRows(state: UserCreateFlowState): ActionRowBuilder<ButtonBuilder>[] {
    const controlsLocked = state.controlsLocked === true;
    const awaitingDiscordId = state.awaitingDiscordId === true;
    const awaitingDisplayName = state.awaitingDisplayName === true;
    const awaitingFriendlyName = state.awaitingFriendlyName === true;
    const awaitingDescription = state.awaitingDescription === true;
    const finalizing = state.finalizing === true;
    const hasDiscordId = Boolean(state.discordId?.trim());

    const primaryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(UserCreateFlowConstants.changeDiscordId)
            .setLabel(`Change Discord ID`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(controlsLocked || finalizing || awaitingDiscordId),
        new ButtonBuilder()
            .setCustomId(UserCreateFlowConstants.changeDisplayName)
            .setLabel(`Change display name`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(controlsLocked || finalizing || awaitingDisplayName),
        new ButtonBuilder()
            .setCustomId(UserCreateFlowConstants.changeFriendlyName)
            .setLabel(`Change friendly name`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(controlsLocked || finalizing || awaitingFriendlyName),
    );

    const secondaryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(UserCreateFlowConstants.changeDescription)
            .setLabel(`Edit description`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(controlsLocked || finalizing || awaitingDescription),
        new ButtonBuilder()
            .setCustomId(UserCreateFlowConstants.confirmCreateId)
            .setLabel(`Create user`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(controlsLocked || finalizing || !hasDiscordId),
        new ButtonBuilder()
            .setCustomId(UserCreateFlowConstants.cancelCreateId)
            .setLabel(`Cancel`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(controlsLocked || finalizing),
    );

    return [primaryRow, secondaryRow];
}
