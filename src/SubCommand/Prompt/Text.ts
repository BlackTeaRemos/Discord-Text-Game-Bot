/**
 * Options for validating text input (no Discord API calls).
 * @property value string Text to validate. @example 'My Name'
 * @property minLength number | undefined Minimum allowed length. @example 1
 * @property maxLength number | undefined Maximum allowed length. @example 100
 * @property validator (s: string) => boolean | string | undefined Optional custom validation. @example (s) => s.length > 0 || 'Cannot be empty'
 * @property cancelWords string[] | undefined Words that indicate cancellation. @example ['cancel', 'stop']
 */
export interface TextPromptValidationOptions {
    value: string;
    minLength?: number;
    maxLength?: number;
    validator?: (s: string) => boolean | string;
    cancelWords?: string[];
}

/**
 * Result from text input validation.
 * @property status 'ok' | 'cancel' | 'error' Indicates validation outcome. @example 'ok'
 * @property value string | undefined Validated text if ok. @example 'My Name'
 * @property errorMessage string | undefined Error details if validation failed. @example 'Input too short'
 */
export interface TextPromptValidationResult {
    status: `ok` | `cancel` | `error`;
    value?: string;
    errorMessage?: string;
}

/**
 * Validate text input (pure business logic, no Discord API interactions).
 * @param options TextPromptValidationOptions Configuration for validation. @example ValidateTextInput({ value: 'name', minLength: 1, maxLength: 100 });
 * @returns TextPromptValidationResult Validation result. @example { status: 'ok', value: 'name' }
 */
export function ValidateTextInput(options: TextPromptValidationOptions): TextPromptValidationResult {
    const { value, minLength = 0, maxLength = Infinity, validator, cancelWords = [] } = options;

    if (cancelWords.includes(value.toLowerCase())) {
        return { status: `cancel` };
    }

    if (value.length < minLength) {
        return { status: `error`, errorMessage: `Input too short (minimum ${minLength} characters).` };
    }

    if (value.length > maxLength) {
        return { status: `error`, errorMessage: `Input too long (maximum ${maxLength} characters).` };
    }

    if (validator) {
        const result = validator(value);
        if (result === false) {
            return { status: `error`, errorMessage: `Validation failed.` };
        }
        if (typeof result === `string`) {
            return { status: `error`, errorMessage: result };
        }
    }

    return { status: `ok`, value };
}
