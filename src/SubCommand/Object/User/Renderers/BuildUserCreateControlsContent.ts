import type { UserCreateFlowState } from '../../../../Flow/Object/User/CreateState.js';

/**
 * Provide instructional text for the control panel message based on current state.
 * @param state UserCreateFlowState Mutable flow state. @example BuildUserCreateControlsContent(state)
 * @returns string Multiline guidance text. @example const text = BuildUserCreateControlsContent(state)
 */
export function BuildUserCreateControlsContent(state: UserCreateFlowState): string {
    if (state.controlsLocked) {
        return `Controls are disabled because this user creation session ended. Run the command again to continue.`;
    }

    const segments: string[] = [`Adjust the user details using the buttons below before registering.`];

    if (state.awaitingDiscordId) {
        segments.push(`Waiting for a message containing the Discord user ID.`);
    }
    if (state.awaitingDisplayName) {
        segments.push(`Waiting for a message containing the display name.`);
    }
    if (state.awaitingFriendlyName) {
        segments.push(`Waiting for a message containing the friendly name.`);
    }
    if (state.awaitingDescription) {
        segments.push(`Waiting for a message containing the user description.`);
    }

    if (state.finalizing) {
        segments.push(`Finalizing user creation. This may take a few moments.`);
    }

    return segments.join(`\n`);
}
