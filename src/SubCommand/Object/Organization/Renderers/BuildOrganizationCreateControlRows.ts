import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { OrganizationCreateFlowState } from '../../../../Flow/Object/Organization/CreateState.js';
import { OrganizationCreateFlowConstants } from '../../../../Flow/Object/Organization/CreateState.js';

/**
 * Build the action rows containing organization creation controls.
 * @param state OrganizationCreateFlowState Flow state describing control availability. @example BuildOrganizationCreateControlRows(state)
 * @returns ActionRowBuilder<ButtonBuilder>[] Collection of rows to send with the control message. @example const rows = BuildOrganizationCreateControlRows(state)
 */
export function BuildOrganizationCreateControlRows(
    state: OrganizationCreateFlowState,
): Array<ActionRowBuilder<ButtonBuilder>> {
    const controlsLocked = state.controlsLocked === true;
    const awaitingName = state.awaitingName === true;
    const awaitingFriendlyName = state.awaitingFriendlyName === true;
    const awaitingDescription = state.awaitingDescription === true;
    const finalizing = state.finalizing === true;

    const primaryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(OrganizationCreateFlowConstants.changeNameId)
            .setLabel(`Change name`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(controlsLocked || finalizing || awaitingName),
        new ButtonBuilder()
            .setCustomId(OrganizationCreateFlowConstants.changeFriendlyNameId)
            .setLabel(`Change friendly name`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(controlsLocked || finalizing || awaitingFriendlyName),
        new ButtonBuilder()
            .setCustomId(OrganizationCreateFlowConstants.changeDescriptionId)
            .setLabel(`Edit description`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(controlsLocked || finalizing || awaitingDescription),
    );

    const secondaryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(OrganizationCreateFlowConstants.confirmCreateId)
            .setLabel(`Create organization`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(controlsLocked || finalizing || !state.organizationName?.trim()),
        new ButtonBuilder()
            .setCustomId(OrganizationCreateFlowConstants.cancelCreateId)
            .setLabel(`Cancel`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(controlsLocked || finalizing),
    );

    return [primaryRow, secondaryRow];
}
