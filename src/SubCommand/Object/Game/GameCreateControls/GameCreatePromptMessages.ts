export const GameCreatePromptMessages = {
    nameCancel: `Name unchanged. Send a new value using the button when ready.`,
    descriptionCancel: `Description unchanged. Press the button again when you want to update it.`,
    imageCancel: `Image left as-is. Use the button again to try another file or URL.`,
    imageTimeout: `No image received. Press the button when you are ready to provide an image.`,
    genericError: `Something went wrong while updating the game. Please try again.`,
} as const;

export interface NormalizeGameCreatePromptErrorMessageOptions {
    /**
     * Raw error text emitted by the prompt helper.
     * @example "User cancelled the text prompt."
     */
    message: string;
    /**
     * Replacement string returned when the user cancels the prompt.
     * @example GameCreatePromptMessages.nameCancel
     */
    cancelMessage: string;
    /**
     * Replacement string returned when the prompt times out waiting for user input.
     * @example GameCreatePromptMessages.imageTimeout
     */
    timeoutMessage?: string;
    /**
     * Default fallback presented when the error cannot be mapped to a known condition.
     * @example GameCreatePromptMessages.genericError
     */
    defaultMessage?: string;
}

/**
 * Normalize prompt error messages emitted during the interactive flow into human friendly strings.
 * @param options NormalizeGameCreatePromptErrorMessageOptions Error mapping configuration.
 * @returns string Normalized prompt message suitable for end users.
 * @example
 * const text = NormalizeGameCreatePromptErrorMessage({
 *     message: err.message,
 *     cancelMessage: GameCreatePromptMessages.nameCancel,
 *     defaultMessage: GameCreatePromptMessages.genericError,
 * });
 */
export function NormalizeGameCreatePromptErrorMessage(options: NormalizeGameCreatePromptErrorMessageOptions): string {
    const { message, cancelMessage, timeoutMessage, defaultMessage = GameCreatePromptMessages.genericError } = options;
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
