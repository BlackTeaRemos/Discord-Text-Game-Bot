import type { UserCreateFlowState } from '../../../../Flow/Object/User/CreateState.js';
import { Translate } from '../../../../Services/I18nService.js';

/**
 * Provide instructional text for the control panel message based on current state.
 * @param state UserCreateFlowState Mutable flow state. @example BuildUserCreateControlsContent(state)
 * @returns string Multiline guidance text. @example const text = BuildUserCreateControlsContent(state)
 */
export function BuildUserCreateControlsContent(state: UserCreateFlowState): string {
    if (state.controlsLocked) {
        return Translate(`userCreate.controlsMessage.controlsLocked`);
    }

    const segments: string[] = [Translate(`userCreate.controlsMessage.intro`)];

    if (state.awaitingDiscordId) {
        segments.push(Translate(`userCreate.controlsMessage.awaitingDiscordId`));
    }
    if (state.awaitingDisplayName) {
        segments.push(Translate(`userCreate.controlsMessage.awaitingDisplayName`));
    }
    if (state.awaitingFriendlyName) {
        segments.push(Translate(`userCreate.controlsMessage.awaitingFriendlyName`));
    }
    if (state.awaitingDescription) {
        segments.push(Translate(`userCreate.controlsMessage.awaitingDescription`));
    }

    if (state.finalizing) {
        segments.push(Translate(`userCreate.controlsMessage.finalizing`));
    }

    return segments.join(`\n`);
}
