import type { ITemplateDisplayConfig } from '../../Domain/GameObject/ITemplateDisplayConfig.js';
import type { ICardStyleConfig } from '../../Domain/GameObject/ICardStyleConfig.js';

/** Allowed graph type values for individual parameters. */
const _VALID_GRAPH_TYPES = new Set([`sparkline`, `bar`, `none`]);

/** Allowed chart type values for standalone display charts. */
const _VALID_CHART_TYPES = new Set([`combined`, `cumulative`, `relative`]);

/** CSS hex colour pattern (3, 4, 6, or 8 hex digits). */
const _HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Validate an ITemplateDisplayConfig object.
 * Returns an array of human-readable error strings. Empty array means valid.
 *
 * @param config ITemplateDisplayConfig Configuration to validate.
 * @returns string[] Validation error messages.
 *
 * @example
 * const errors = ValidateDisplayConfig(config);
 * if (errors.length > 0) { throw new Error(errors.join(', ')); }
 */
export function ValidateDisplayConfig(config: ITemplateDisplayConfig): string[] {
    const errors: string[] = [];

    if (!config || typeof config !== `object`) {
        errors.push(`Config must be a non-null object.`);
        return errors;
    }

    // Validate styleConfig if present
    if (config.styleConfig !== undefined && config.styleConfig !== null) {
        __ValidateStyleConfig(config.styleConfig, errors);
    }

    if (!Array.isArray(config.groups)) {
        errors.push(`"groups" must be an array.`);
    } else {
        const groupKeys = new Set<string>();
        for (const group of config.groups) {
            if (!group.key || typeof group.key !== `string`) {
                errors.push(`Each group must have a non-empty string "key".`);
            }
            if (!group.label || typeof group.label !== `string`) {
                errors.push(`Group "${group.key}" must have a non-empty string "label".`);
            }
            if (typeof group.sortOrder !== `number`) {
                errors.push(`Group "${group.key}" must have a numeric "sortOrder".`);
            }
            if (groupKeys.has(group.key)) {
                errors.push(`Duplicate group key "${group.key}".`);
            }
            groupKeys.add(group.key);
        }
    }

    // Validate charts if present
    if (config.charts !== undefined) {
        if (!Array.isArray(config.charts)) {
            errors.push(`"charts" must be an array.`);
        } else {
            const chartKeys = new Set<string>();
            for (const chart of config.charts) {
                if (!chart.key || typeof chart.key !== `string`) {
                    errors.push(`Each chart must have a non-empty string "key".`);
                }
                if (!_VALID_CHART_TYPES.has(chart.chartType)) {
                    errors.push(`Chart "${chart.key}" has invalid chartType "${chart.chartType}".`);
                }
                if (!Array.isArray(chart.parameterKeys) || chart.parameterKeys.length === 0) {
                    errors.push(`Chart "${chart.key}" must have a non-empty "parameterKeys" array.`);
                }
                if (typeof chart.sortOrder !== `number`) {
                    errors.push(`Chart "${chart.key}" must have a numeric "sortOrder".`);
                }
                if (chart.chartHeight !== undefined && (typeof chart.chartHeight !== `number` || chart.chartHeight < 0)) {
                    errors.push(`Chart "${chart.key}" has invalid chartHeight — must be a non-negative number.`);
                }
                if (chartKeys.has(chart.key)) {
                    errors.push(`Duplicate chart key "${chart.key}".`);
                }
                chartKeys.add(chart.key);
            }
        }
    }

    if (!Array.isArray(config.parameterDisplay)) {
        errors.push(`"parameterDisplay" must be an array.`);
    } else {
        const paramKeys = new Set<string>();
        for (const paramDisplay of config.parameterDisplay) {
            if (!paramDisplay.key || typeof paramDisplay.key !== `string`) {
                errors.push(`Each parameterDisplay entry must have a non-empty string "key".`);
            }
            if (!_VALID_GRAPH_TYPES.has(paramDisplay.graphType)) {
                errors.push(`Parameter "${paramDisplay.key}" has invalid graphType "${paramDisplay.graphType}".`);
            }
            if (typeof paramDisplay.hidden !== `boolean`) {
                errors.push(`Parameter "${paramDisplay.key}" must have a boolean "hidden".`);
            }
            if (typeof paramDisplay.displayOrder !== `number`) {
                errors.push(`Parameter "${paramDisplay.key}" must have a numeric "displayOrder".`);
            }
            if (paramKeys.has(paramDisplay.key)) {
                errors.push(`Duplicate parameterDisplay key "${paramDisplay.key}".`);
            }
            paramKeys.add(paramDisplay.key);
        }
    }

    return errors;
}

/**
 * Validate optional style config colour and numeric fields.
 *
 * @param styleConfig ICardStyleConfig Style overrides to validate.
 * @param errors string[] Error accumulator.
 */
function __ValidateStyleConfig(styleConfig: ICardStyleConfig, errors: string[]): void {
    if (typeof styleConfig !== `object`) {
        errors.push(`"styleConfig" must be an object.`);
        return;
    }

    const _COLOR_FIELDS: Array<keyof ICardStyleConfig> = [
        `cardBackground`, `panelBackground`, `borderColor`,
        `accentColor`, `accentFill`,
        `textPrimary`, `textValue`, `textLabel`, `textSecondary`, `textMuted`,
    ];

    for (const field of _COLOR_FIELDS) {
        const fieldValue = styleConfig[field];
        if (fieldValue !== undefined && (typeof fieldValue !== `string` || !_HEX_COLOR_PATTERN.test(fieldValue))) {
            errors.push(`styleConfig.${field} must be a valid CSS hex colour (e.g. "#ff6600").`);
        }
    }

    if (styleConfig.cardBorderRadius !== undefined && typeof styleConfig.cardBorderRadius !== `number`) {
        errors.push(`styleConfig.cardBorderRadius must be a number.`);
    }
}
