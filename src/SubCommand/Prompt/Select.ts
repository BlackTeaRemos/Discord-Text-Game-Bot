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
