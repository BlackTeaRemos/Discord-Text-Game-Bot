/**
 * Shared messaging helpers used throughout the organization creation flow.
 */
export const OrganizationCreatePromptMessages = {
    nameCancel: `Name unchanged. Use the button again when you want to update it.`,
    friendlyCancel: `Friendly name unchanged. Use the button again when you want to update it.`,
    descriptionCancel: `Description unchanged. Use the button again when you want to update it.`,
    descriptionTimeout: `No description received. Press the button again when you are ready to provide one.`,
    genericError: `Something went wrong while updating the organization. Please try again.`,
} as const;

export interface NormalizeOrganizationCreatePromptErrorMessageOptions {
    /**
     * Raw error message returned by prompt helpers.
     */
    message: string;
    /**
     * Replacement when the user cancels the prompt.
     */
    cancelMessage: string;
    /**
     * Replacement when the prompt times out.
     */
    timeoutMessage?: string;
    /**
     * Default fallback when the error is unmapped.
     */
    defaultMessage?: string;
}

/**
 * Normalize prompt errors emitted during the organization creation flow into friendly strings.
 * @param options NormalizeOrganizationCreatePromptErrorMessageOptions Normalization configuration.
 * @returns string Readable message suitable for Discord follow-ups.
 */
export function NormalizeOrganizationCreatePromptErrorMessage(
    options: NormalizeOrganizationCreatePromptErrorMessageOptions,
): string {
    const {
        message,
        cancelMessage,
        timeoutMessage,
        defaultMessage = OrganizationCreatePromptMessages.genericError,
    } = options;
    if (
        message === `User cancelled the text prompt.` ||
        message === `User cancelled the file prompt.` ||
        message === `User cancelled the image prompt.`
    ) {
        return cancelMessage;
    }
    if (
        message === `User response timeout reached while waiting for text input.` ||
        message === `User response timeout reached while waiting for file input.` ||
        message === `User response timeout reached while waiting for image input.`
    ) {
        return timeoutMessage ?? `No response received. Please press the button again when ready.`;
    }
    return defaultMessage;
}
