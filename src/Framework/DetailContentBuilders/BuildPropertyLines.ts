import type { ObjectDetail } from '../../Flow/Object/FetchObjectDetail.js';
import type { IParameterValue } from '../../Domain/GameObject/IParameterValue.js';
import type { IActionDefinition } from '../../Domain/GameObject/IActionDefinition.js';
import { FormatPropertyKey } from '../DetailFormatters/FormatPropertyKey.js';
import { FormatPropertyValue } from '../DetailFormatters/FormatPropertyValue.js';
import { FormatParameterValue } from '../DetailFormatters/FormatParameterValue.js';
import { ParseJsonProperty } from '../DetailFormatters/ParseJsonProperty.js';
import { HIDDEN_PROPERTIES, HIDDEN_PROPERTY_PATTERN } from './HiddenProperties.js';
import { Translate } from '../../Services/I18nService.js';

/**
 * Build formatted lines for visible properties, template parameters and template actions
 * Parses parameters_json and actions_json from node properties for structured display
 * Returns empty array when no displayable content exists
 *
 * @param detail ObjectDetail Full detail payload
 * @param locale string Locale code for translated section labels. @example 'en'
 * @returns string[] Array of formatted Markdown lines
 */
export function BuildPropertyLines(
    detail: ObjectDetail,
    locale: string = `en`,
): string[] {
    const lines: string[] = [];

    const visibleProperties = Object.entries(detail.properties)
        .filter(([key]) => {
            return !HIDDEN_PROPERTIES.has(key) && !HIDDEN_PROPERTY_PATTERN.test(key);
        });

    if (visibleProperties.length > 0) {
        for (const [key, value] of visibleProperties) {
            const displayValue = FormatPropertyValue(value);
            lines.push(`**${FormatPropertyKey(key)}**: ${displayValue}`);
        }
    }

    // Parse template parameters from JSON if present on the node
    const templateParams = ParseJsonProperty<IParameterValue[]>(detail.properties.parameters_json);
    if (templateParams && templateParams.length > 0) {
        if (lines.length > 0) {
            lines.push(``);
        }
        const variablesLabel = Translate(`card.sections.parameters`, { locale, defaultValue: `Variables` });
        lines.push(`__${variablesLabel}__`);
        for (const paramValue of templateParams) {
            const label = FormatPropertyKey(paramValue.key);
            lines.push(`**${label}**: \`${String(paramValue.value)}\``);
        }
    }

    // Also include legacy HAS_PARAMETER parameters
    const legacyParameterEntries = Object.entries(detail.parameters);
    if (legacyParameterEntries.length > 0) {
        if (lines.length > 0 && (!templateParams || templateParams.length === 0)) {
            lines.push(``);
        }
        if (!templateParams || templateParams.length === 0) {
            const parametersLabel = Translate(`card.sections.parameters`, { locale, defaultValue: `Variables` });
            lines.push(`__${parametersLabel}__`);
        }
        for (const [key, value] of legacyParameterEntries) {
            lines.push(`**${FormatPropertyKey(key)}**: ${FormatParameterValue(value)}`);
        }
    }

    // Parse template actions from JSON if present
    const templateActions = ParseJsonProperty<IActionDefinition[]>(detail.properties.actions_json);
    if (templateActions && templateActions.length > 0) {
        if (lines.length > 0) {
            lines.push(``);
        }
        const actionsLabel = Translate(`card.sections.actions`, { locale, defaultValue: `Actions` });
        lines.push(`__${actionsLabel}__`);
        for (const action of templateActions) {
            const enabledMark = action.enabled ? `+` : `-`;
            const triggerLabel = FormatPropertyKey(action.trigger);
            lines.push(`[${enabledMark}] **${action.label}** _(${triggerLabel})_`);
            if (action.description) {
                lines.push(`-# ${action.description}`);
            }
            if (action.expressions && action.expressions.length > 0) {
                const expressionPreview = action.expressions
                    .slice(0, 3)
                    .map((expr: string) => {
                        return `\`${expr}\``;
                    })
                    .join(`, `);
                lines.push(`-# ${expressionPreview}`);
            }
        }
    }

    return lines;
}
