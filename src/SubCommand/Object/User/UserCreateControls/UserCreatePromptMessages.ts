import type { ExecutionContext } from '../../../../Domain/Command.js';
import { TranslateFromContext } from '../../../../Services/I18nService.js';

export interface UserCreatePromptMessages {
    discordIdCancel: string;
    discordIdTimeout: string;
    displayNameCancel: string;
    displayNameTimeout: string;
    friendlyNameCancel: string;
    friendlyNameTimeout: string;
    descriptionCancel: string;
    descriptionTimeout: string;
    genericError: string;
}

/**
 * Build localized prompt messages for the user create flow.
 * @param executionContext ExecutionContext Optional cached context.
 * @returns UserCreatePromptMessages Localized prompt text.
 */
export function GetUserCreatePromptMessages(executionContext?: ExecutionContext): UserCreatePromptMessages {
    return {
        discordIdCancel: TranslateFromContext(executionContext, `userCreate.prompt.discordIdCancel`),
        discordIdTimeout: TranslateFromContext(executionContext, `userCreate.prompt.discordIdTimeout`),
        displayNameCancel: TranslateFromContext(executionContext, `userCreate.prompt.displayNameCancel`),
        displayNameTimeout: TranslateFromContext(executionContext, `userCreate.prompt.displayNameTimeout`),
        friendlyNameCancel: TranslateFromContext(executionContext, `userCreate.prompt.friendlyNameCancel`),
        friendlyNameTimeout: TranslateFromContext(executionContext, `userCreate.prompt.friendlyNameTimeout`),
        descriptionCancel: TranslateFromContext(executionContext, `userCreate.prompt.descriptionCancel`),
        descriptionTimeout: TranslateFromContext(executionContext, `userCreate.prompt.descriptionTimeout`),
        genericError: TranslateFromContext(executionContext, `userCreate.prompt.genericError`),
    };
}

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
export function NormalizeUserCreatePromptErrorMessage(
    options: NormalizeUserCreatePromptErrorMessageOptions,
    executionContext?: ExecutionContext,
): string {
    const promptMessages = GetUserCreatePromptMessages(executionContext);
    const { message, cancelMessage, timeoutMessage, defaultMessage = promptMessages.genericError } = options;
    if (
        message === TranslateFromContext(executionContext, `prompt.text.cancelled`) ||
        message === TranslateFromContext(executionContext, `prompt.file.cancelled`) ||
        message === TranslateFromContext(executionContext, `prompt.image.cancelled`)
    ) {
        return cancelMessage;
    }
    if (
        message === TranslateFromContext(executionContext, `prompt.text.timeout`) ||
        message === TranslateFromContext(executionContext, `prompt.file.timeout`) ||
        message === TranslateFromContext(executionContext, `prompt.image.timeout`)
    ) {
        return timeoutMessage ?? TranslateFromContext(executionContext, `userCreate.prompt.noResponse`);
    }
    return defaultMessage;
}
