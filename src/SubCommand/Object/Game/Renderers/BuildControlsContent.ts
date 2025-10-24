import type { GameCreateFlowState } from '../../../../Flow/Object/Game/CreateState.js';

/**
 * Provide instructional text for the control panel message based on current state.
 * @param state GameCreateFlowState Mutable flow state. @example BuildControlsContent(state)
 * @returns string Multiline guidance text. @example const text = BuildControlsContent(state)
 */
export function BuildControlsContent(state: GameCreateFlowState): string {
    const segments: string[] = [`Adjust the game details using the buttons below before creating it.`];
    if (state.awaitingName) {
        segments.push(`Waiting for a message containing the new name.`);
    }
    if (state.awaitingDescription) {
        segments.push(`Waiting for a message containing the description text.`);
    }
    if (state.awaitingImage) {
        segments.push(`Waiting for an image attachment or direct image URL.`);
    }
    if (state.uploadInProgress) {
        segments.push(`Uploading the latest image; controls are temporarily paused.`);
    }
    return segments.join(`\n`);
}
