/**
 * Options for validating select menu input (no Discord API calls).
 * @property value string | undefined Selected value to validate. @example 'option_1'
 * @property validOptions string[] | undefined List of valid option values. @example ['option_1', 'option_2']
 * @property validator (value: string) => boolean | string | undefined Optional custom validation. @example (v) => v !== 'invalid' || 'Invalid choice'
 * @property cancelWords string[] | undefined Words that indicate cancellation. @example ['cancel', 'skip']
 */
export interface SelectPromptValidationOptions {
    value?: string;
    validOptions?: string[];
    validator?: (value: string) => boolean | string;
    cancelWords?: string[];
}

/**
 * Result from select menu validation.
 * @property status 'ok' | 'cancel' | 'error' Indicates validation outcome. @example 'ok'
 * @property value string | undefined Selected value if ok. @example 'option_1'
 * @property errorMessage string | undefined Error details if validation failed. @example 'Invalid selection'
 */
export interface SelectPromptValidationResult {
    status: `ok` | `cancel` | `error`;
    value?: string;
    errorMessage?: string;
}

/**
 * Validate select menu input (pure business logic, no Discord API interactions).
 * @param options SelectPromptValidationOptions Configuration for validation. @example ValidateSelectInput({ value: 'opt1', validOptions: ['opt1', 'opt2'] });
 * @returns SelectPromptValidationResult Validation result. @example { status: 'ok', value: 'opt1' }
 */
export function ValidateSelectInput(options: SelectPromptValidationOptions): SelectPromptValidationResult {
    const { value, validOptions = [], validator, cancelWords = [] } = options;

    if (!value) {
        return { status: `error`, errorMessage: `Selection required.` };
    }

    if (cancelWords.includes(value.toLowerCase())) {
        return { status: `cancel` };
    }

    if (validOptions.length > 0 && !validOptions.includes(value)) {
        return { status: `error`, errorMessage: `Invalid selection.` };
    }

    if (validator) {
        const result = validator(value);
        if (result === false) {
            return { status: `error`, errorMessage: `Selection validation failed.` };
        }
        if (typeof result === `string`) {
            return { status: `error`, errorMessage: result };
        }
    }

    return { status: `ok`, value };
}
