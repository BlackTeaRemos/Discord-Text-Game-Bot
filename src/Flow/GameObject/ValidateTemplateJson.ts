import type { TemplateJsonSchema, TemplateParameterSchema, TemplateActionSchema } from './TemplateJsonSchema.js';

/** Valid identifier pattern for parameter keys and action keys. */
const VALID_KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Allowed value types for parameters. */
const VALID_VALUE_TYPES = new Set([`number`, `string`, `boolean`]);

/** Allowed action triggers. */
const VALID_TRIGGERS = new Set([`onTurnAdvance`, `onManual`, `onCreate`, `onDestroy`]);

/**
 * Result of template validation.
 */
export interface TemplateValidationResult {
    /** Whether the template passed all checks. @example true */
    valid: boolean;

    /** List of human-readable error messages. Empty when valid. */
    errors: string[];
}

/**
 * Validate an uploaded template JSON object.
 * @param input unknown Raw parsed JSON to validate.
 * @returns TemplateValidationResult Validation outcome with error details.
 * @example
 * const result = ValidateTemplateJson(JSON.parse(rawJson));
 * if (!result.valid) { console.error(result.errors); }
 */
export function ValidateTemplateJson(input: unknown): TemplateValidationResult {
    const errors: string[] = [];

    if (typeof input !== `object` || input === null || Array.isArray(input)) {
        return { valid: false, errors: [`Template must be a JSON object.`] };
    }

    const template = input as Record<string, unknown>;

    __ValidateName(template, errors);
    const parameterKeys = __ValidateParameters(template, errors);
    __ValidateActions(template, parameterKeys, errors);

    return { valid: errors.length === 0, errors };
}

/**
 * Validate the name field.
 * @param template Record<string, unknown> Template object.
 * @param errors string[] Accumulator for errors.
 */
function __ValidateName(template: Record<string, unknown>, errors: string[]): void {
    if (typeof template.name !== `string` || template.name.trim().length === 0) {
        errors.push(`"name" is required and must be a non-empty string.`);
    }
}

/**
 * Validate parameters array and collect valid keys for expression validation.
 * @param template Record<string, unknown> Template object.
 * @param errors string[] Accumulator for errors.
 * @returns Set<string> Set of valid parameter keys.
 */
function __ValidateParameters(template: Record<string, unknown>, errors: string[]): Set<string> {
    const keys = new Set<string>();

    if (!Array.isArray(template.parameters)) {
        errors.push(`"parameters" is required and must be an array.`);
        return keys;
    }

    const parameters = template.parameters as unknown[];

    if (parameters.length === 0) {
        errors.push(`"parameters" must contain at least one parameter definition.`);
        return keys;
    }

    for (let parameterIndex = 0; parameterIndex < parameters.length; parameterIndex++) {
        const parameter = parameters[parameterIndex] as Record<string, unknown>;
        const prefix = `parameters[${parameterIndex}]`;

        if (typeof parameter !== `object` || parameter === null) {
            errors.push(`${prefix}: must be an object.`);
            continue;
        }

        if (typeof parameter.key !== `string` || !VALID_KEY_PATTERN.test(parameter.key)) {
            errors.push(`${prefix}.key: must be a valid identifier (letters, digits, underscore, starting with letter or underscore).`);
        } else if (keys.has(parameter.key)) {
            errors.push(`${prefix}.key: duplicate key "${parameter.key}".`);
        } else {
            keys.add(parameter.key);
        }

        if (typeof parameter.label !== `string` || parameter.label.trim().length === 0) {
            errors.push(`${prefix}.label: required non-empty string.`);
        }

        if (typeof parameter.valueType !== `string` || !VALID_VALUE_TYPES.has(parameter.valueType)) {
            errors.push(`${prefix}.valueType: must be one of "number", "string", "boolean".`);
        }

        if (parameter.defaultValue === undefined || parameter.defaultValue === null) {
            errors.push(`${prefix}.defaultValue: required.`);
        }
    }

    return keys;
}

/**
 * Validate actions array and check expression syntax against known parameter keys.
 * @param template Record<string, unknown> Template object.
 * @param parameterKeys Set<string> Valid parameter keys for expression validation.
 * @param errors string[] Accumulator for errors.
 */
function __ValidateActions(template: Record<string, unknown>, parameterKeys: Set<string>, errors: string[]): void {
    if (template.actions === undefined || template.actions === null) {
        return; // actions are optional
    }

    if (!Array.isArray(template.actions)) {
        errors.push(`"actions" must be an array when provided.`);
        return;
    }

    const actionKeys = new Set<string>();
    const actions = template.actions as unknown[];

    for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
        const action = actions[actionIndex] as Record<string, unknown>;
        const prefix = `actions[${actionIndex}]`;

        if (typeof action !== `object` || action === null) {
            errors.push(`${prefix}: must be an object.`);
            continue;
        }

        if (typeof action.key !== `string` || !VALID_KEY_PATTERN.test(action.key)) {
            errors.push(`${prefix}.key: must be a valid identifier.`);
        } else if (actionKeys.has(action.key)) {
            errors.push(`${prefix}.key: duplicate action key "${action.key}".`);
        } else {
            actionKeys.add(action.key);
        }

        if (typeof action.label !== `string` || (action.label as string).trim().length === 0) {
            errors.push(`${prefix}.label: required non-empty string.`);
        }

        if (typeof action.trigger !== `string` || !VALID_TRIGGERS.has(action.trigger as string)) {
            errors.push(`${prefix}.trigger: must be one of "onTurnAdvance", "onManual", "onCreate", "onDestroy".`);
        }

        if (!Array.isArray(action.expressions) || (action.expressions as unknown[]).length === 0) {
            errors.push(`${prefix}.expressions: required non-empty array of expression strings.`);
        } else {
            const expressions = action.expressions as unknown[];
            for (let expressionIndex = 0; expressionIndex < expressions.length; expressionIndex++) {
                const expression = expressions[expressionIndex];
                if (typeof expression !== `string` || (expression as string).trim().length === 0) {
                    errors.push(`${prefix}.expressions[${expressionIndex}]: must be a non-empty string.`);
                }
            }
        }

    }
}

/**
 * Cast a validated template JSON to the typed schema. Call only after ValidateTemplateJson returns valid.
 * @param input unknown Validated JSON input.
 * @returns TemplateJsonSchema Typed template object.
 */
export function CastTemplateJson(input: unknown): TemplateJsonSchema {
    const raw = input as Record<string, unknown>;
    const parameters = (raw.parameters as TemplateParameterSchema[]).map(parameter => {
        return {
            key: parameter.key,
            label: parameter.label,
            valueType: parameter.valueType,
            defaultValue: parameter.defaultValue,
            category: parameter.category,
            description: parameter.description,
        };
    });

    const actions = Array.isArray(raw.actions)
        ? (raw.actions as TemplateActionSchema[]).map(action => {
            return {
                key: action.key,
                label: action.label,
                trigger: action.trigger,
                priority: action.priority ?? 100,
                expressions: action.expressions,
                description: action.description,
                enabled: action.enabled ?? true,
            };
        })
        : [];

    return {
        name: raw.name as string,
        description: (raw.description as string) ?? ``,
        parameters,
        actions,
    };
}
