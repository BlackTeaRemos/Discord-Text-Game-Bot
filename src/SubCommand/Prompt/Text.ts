export interface TextPromptValidationOptions {
    value?: string;
    minLength?: number;
    maxLength?: number;
    cancelWords?: string[];
    validator?: (value: string) => boolean | string | undefined;
}

/**
 * Result describing the outcome of text prompt validation.
 * @property status 'ok' | 'cancel' | 'error' Validation result state. @example 'ok'
 * @property value string | undefined Sanitized text when validation succeeds. @example 'Validated text'
 * @property errorMessage string | undefined Reason for failure when status is 'error'. @example 'Too short'
 */
export interface TextPromptValidationResult {
    status: `ok` | `cancel` | `error`;
    value?: string;
    errorMessage?: string;
}

/** Default error returned when custom validation rejects the submitted text. */
const DEFAULT_VALIDATOR_FAILURE_MESSAGE = `The provided text did not pass validation.`;

/** Default error returned when the user submits an empty value. */
const DEFAULT_EMPTY_VALUE_MESSAGE = `Please provide a response before continuing.`;

/**
 * Validate text prompt input prior to resolving asynchronous prompt workflows.
 * @param options TextPromptValidationOptions Validation configuration. @example ValidateTextInput({ value: 'My game' })
 * @returns TextPromptValidationResult Validation status information. @example { status: 'ok', value: 'My game' }
 */
export function ValidateTextInput(options: TextPromptValidationOptions): TextPromptValidationResult {
    const { value, minLength, maxLength, cancelWords = [], validator } = options;

    const normalizedValue = (value ?? ``).trim();
    const normalizedLowerValue = normalizedValue.toLowerCase();

    if (
        cancelWords.some(word => {
            return word.trim().toLowerCase() === normalizedLowerValue && word.trim().length > 0;
        })
    ) {
        return { status: `cancel` };
    }

    if (normalizedValue.length === 0) {
        return { status: `error`, errorMessage: DEFAULT_EMPTY_VALUE_MESSAGE };
    }

    if (typeof minLength === `number` && Number.isFinite(minLength) && normalizedValue.length < minLength) {
        const minimumMessage =
            minLength === 1
                ? `Response must contain at least one character.`
                : `Response must contain at least ${minLength} characters.`;
        return { status: `error`, errorMessage: minimumMessage };
    }

    if (typeof maxLength === `number` && Number.isFinite(maxLength) && normalizedValue.length > maxLength) {
        return { status: `error`, errorMessage: `Response must not exceed ${maxLength} characters.` };
    }

    if (validator) {
        let result: boolean | string | undefined;
        try {
            result = validator(normalizedValue);
        } catch (error) {
            if (error instanceof Error && error.message.trim().length > 0) {
                return { status: `error`, errorMessage: error.message };
            }
            return { status: `error`, errorMessage: DEFAULT_VALIDATOR_FAILURE_MESSAGE };
        }

        if (result === false) {
            return { status: `error`, errorMessage: DEFAULT_VALIDATOR_FAILURE_MESSAGE };
        }

        if (typeof result === `string`) {
            if (result.trim().length === 0) {
                return { status: `error`, errorMessage: DEFAULT_VALIDATOR_FAILURE_MESSAGE };
            }
            return { status: `error`, errorMessage: result };
        }
    }

    return { status: `ok`, value: normalizedValue };
}
