export const UserCreatePromptMessages = {
    discordIdCancel: `Discord ID unchanged. Use the button again when you want to update it.`,
    discordIdTimeout: `No Discord ID received. Press the button again when you are ready to provide one.`,
    displayNameCancel: `Display name unchanged. Use the button again when you want to update it.`,
    displayNameTimeout: `No display name received. Press the button again when you are ready to provide one.`,
    friendlyNameCancel: `Friendly name unchanged. Use the button again when you want to update it.`,
    friendlyNameTimeout: `No friendly name received. Press the button again when you are ready to provide one.`,
    descriptionCancel: `Description unchanged. Use the button again when you want to update it.`,
    descriptionTimeout: `No description received. Press the button again when you are ready to provide one.`,
    genericError: `Something went wrong while updating the user. Please try again.`,
} as const;

export interface NormalizeUserCreatePromptErrorMessageOptions {
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
 * Normalize prompt errors emitted during the user creation flow into friendly strings.
 * @param options NormalizeUserCreatePromptErrorMessageOptions Normalization configuration. @example NormalizeUserCreatePromptErrorMessage({ message: 'User cancelled the text prompt.', cancelMessage: 'Cancelled', defaultMessage: 'Something went wrong.' })
 * @returns string Readable message suitable for Discord follow-ups. @example const message = NormalizeUserCreatePromptErrorMessage({ message: 'User cancelled the text prompt.', cancelMessage: 'Cancelled', defaultMessage: 'Something went wrong.' })
 */
export function NormalizeUserCreatePromptErrorMessage(options: NormalizeUserCreatePromptErrorMessageOptions): string {
    const { message, cancelMessage, timeoutMessage, defaultMessage = UserCreatePromptMessages.genericError } = options;
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
