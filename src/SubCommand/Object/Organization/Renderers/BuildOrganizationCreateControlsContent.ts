import type { OrganizationCreateFlowState } from '../../../../Flow/Object/Organization/CreateState.js';

/**
 * Compose the textual guidance shown above the organization creation controls.
 * @param state OrganizationCreateFlowState Flow state informing the displayed instructions. @example BuildOrganizationCreateControlsContent(state)
 * @returns string Multiline string describing the current control status. @example const content = BuildOrganizationCreateControlsContent(state)
 */
export function BuildOrganizationCreateControlsContent(state: OrganizationCreateFlowState): string {
    if (state.controlsLocked) {
        return `This organization creation session has ended. Run the command again to make further changes.`;
    }

    const segments: string[] = [`Adjust the organization details using the buttons below before committing creation.`];

    if (state.awaitingName) {
        segments.push(`Waiting for a message containing the organization name.`);
    }
    if (state.awaitingFriendlyName) {
        segments.push(`Waiting for a message containing the friendly name.`);
    }
    if (state.awaitingDescription) {
        segments.push(`Waiting for a message containing the organization description.`);
    }
    if (state.finalizing) {
        segments.push(`Finalizing organization creation. This may take a few moments.`);
    }

    return segments.join(`\n`);
}
