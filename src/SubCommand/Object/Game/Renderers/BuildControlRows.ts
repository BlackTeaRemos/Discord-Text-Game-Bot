import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { GameCreateFlowState } from '../../../../Flow/Object/Game/CreateState.js';
import { GameCreateFlowConstants } from '../../../../Flow/Object/Game/CreateState.js';
import { Translate } from '../../../../Services/I18nService.js';

/**
 * Create the action rows representing the control buttons for the flow.
 * @param state GameCreateFlowState Mutable flow state. @example BuildControlRows(state)
 * @returns ActionRowBuilder<ButtonBuilder>[] Button rows representing UI controls.
 */
export function BuildControlRows(state: GameCreateFlowState): ActionRowBuilder<ButtonBuilder>[] {
    const controlsLocked = state.controlsLocked === true;
    const uploadPaused = state.uploadInProgress === true;
    const finalizing = state.finalizing === true;
    const confirmLabel = state.mode === `update`
        ? Translate(`gameCreate.controls.saveChanges`)
        : Translate(`gameCreate.controls.createGame`);
    const cancelLabel = state.mode === `update`
        ? Translate(`gameCreate.controls.cancelUpdate`)
        : Translate(`common.cancel`);

    const primaryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.changeNameId)
            .setLabel(Translate(`gameCreate.controls.changeName`))
            .setStyle(ButtonStyle.Primary)
            .setDisabled(controlsLocked || finalizing || Boolean(state.awaitingName) || uploadPaused),
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.changeDescriptionId)
            .setLabel(Translate(`gameCreate.controls.changeDescription`))
            .setStyle(ButtonStyle.Primary)
            .setDisabled(controlsLocked || finalizing || Boolean(state.awaitingDescription) || uploadPaused),
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.changeImageId)
            .setLabel(Translate(`gameCreate.controls.changeImage`))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(controlsLocked || finalizing || Boolean(state.awaitingImage) || uploadPaused),
    );

    const secondaryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.confirmCreateId)
            .setLabel(confirmLabel)
            .setStyle(ButtonStyle.Success)
            .setDisabled(controlsLocked || finalizing || !state.gameName?.trim() || uploadPaused),
        new ButtonBuilder()
            .setCustomId(GameCreateFlowConstants.cancelCreateId)
            .setLabel(cancelLabel)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(controlsLocked || finalizing || uploadPaused),
    );

    return [primaryRow, secondaryRow];
}
