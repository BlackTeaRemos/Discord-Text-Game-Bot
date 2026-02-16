import type { ObjectDetail } from '../../Flow/Object/FetchObjectDetail.js';
import { Element } from './SatoriElement.js';
import type { SatoriElement, SatoriChild } from './SatoriElement.js';
import {
    CARD_BACKGROUND,
    PANEL_BACKGROUND,
    BORDER_COLOR,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    TEXT_MUTED,
    CARD_WIDTH,
    CARD_BORDER_RADIUS,
    CARD_PADDING,
    FONT_TITLE,
    FONT_NAME,
    FONT_LABEL,
    FONT_VALUE,
    FONT_META,
    IntColorToCss,
} from './CardTheme.js';
import { FormatPropertyKey } from '../DetailFormatters/FormatPropertyKey.js';
import { ParseJsonProperty } from '../DetailFormatters/ParseJsonProperty.js';
import type { IParameterValue } from '../../Domain/GameObject/IParameterValue.js';
import type { IActionDefinition } from '../../Domain/GameObject/IActionDefinition.js';

/** Properties excluded from the card properties panel */
const _CARD_HIDDEN_PROPERTIES = new Set([
    `uid`, `id`, `name`, `friendly_name`, `image`,
    `created_at`, `updated_at`, `createdAt`, `updatedAt`,
    `server_id`, `description`, `parameters_json`, `actions_json`,
    `owner_user_id`, `ownerUserId`, `template_uid`, `templateUid`,
    `parent_uid`, `parentUid`, `game_uid`, `gameUid`,
]);

/** Pattern matching property keys that should be hidden from the card */
const _HIDDEN_PROPERTY_PATTERN = /(?:_id|Id|_uid|Uid|uuid)$/;

/**
 * Options for building the card element tree
 * @property detail ObjectDetail Full object detail payload
 * @property accentColor string CSS hex color for accent elements
 * @property accentEmoji string Emoji displayed next to the type badge
 * @property objectType string Display label for the object type
 * @property description string | null Object description text
 */
export interface CardLayoutOptions {
    detail: ObjectDetail;
    accentColor: string;
    accentEmoji: string;
    objectType: string;
    description: string | null;
}

/**
 * Build the complete Satori element tree for an object card
 * Produces a dark-themed card with header, properties, parameters, and actions
 *
 * @param options CardLayoutOptions Data and theming for the card
 * @returns SatoriElement Root element tree ready for Satori rendering
 *
 * @example
 * const tree = BuildCardLayout({ detail, accentColor: '#3498db', ... });
 * const svg = await satori(tree, { width: 800, height: 600 });
 */
export function BuildCardLayout(options: CardLayoutOptions): SatoriElement {
    const { detail, accentColor, accentEmoji, objectType, description } = options;
    const displayName = String(detail.properties.friendly_name ?? detail.properties.name ?? detail.uid);

    const sections: SatoriChild[] = [];

    // Header section with accent bar, type badge, and name
    sections.push(__buildHeader(displayName, objectType, accentEmoji, accentColor));

    // Description section
    if (description) {
        sections.push(__buildDescription(description));
    }

    // Properties panel
    const visibleProperties = Object.entries(detail.properties)
        .filter(([key]) => !_CARD_HIDDEN_PROPERTIES.has(key) && !_HIDDEN_PROPERTY_PATTERN.test(key));
    if (visibleProperties.length > 0) {
        sections.push(__buildPropertiesPanel(visibleProperties));
    }

    // Template parameters from parameters_json
    const templateParams = ParseJsonProperty<IParameterValue[]>(detail.properties.parameters_json);
    if (templateParams && templateParams.length > 0) {
        sections.push(__buildParametersPanel(templateParams));
    }

    // Legacy HAS_PARAMETER parameters
    const legacyParams = Object.entries(detail.parameters);
    if (legacyParams.length > 0 && (!templateParams || templateParams.length === 0)) {
        sections.push(__buildLegacyParametersPanel(legacyParams));
    }

    // Template actions from actions_json
    const templateActions = ParseJsonProperty<IActionDefinition[]>(detail.properties.actions_json);
    if (templateActions && templateActions.length > 0) {
        sections.push(__buildActionsPanel(templateActions, accentColor));
    }

    // Timestamps footer
    sections.push(__buildFooter(detail));

    return Element(`div`, {
        flexDirection: `column`,
        width: CARD_WIDTH,
        backgroundColor: CARD_BACKGROUND,
        borderRadius: CARD_BORDER_RADIUS,
        padding: CARD_PADDING,
        gap: 12,
    }, sections);
}

/**
 * Header with accent bar, type badge, and object name
 */
function __buildHeader(
    name: string,
    objectType: string,
    emoji: string,
    accentColor: string,
): SatoriElement {
    return Element(`div`, { flexDirection: `column`, gap: 6 }, [
        // Accent bar at top
        Element(`div`, {
            height: 4,
            width: `100%`,
            backgroundColor: accentColor,
            borderRadius: 2,
        }),
        // Type badge
        Element(`div`, { alignItems: `center`, gap: 8 }, [
            Element(`span`, {
                fontSize: FONT_LABEL,
                color: accentColor,
                backgroundColor: `${accentColor}20`,
                paddingTop: 4,
                paddingBottom: 4,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 8,
                fontWeight: 600,
            }, `${emoji}  ${objectType.toUpperCase()}`),
        ]),
        // Object name
        Element(`span`, {
            fontSize: FONT_TITLE,
            fontWeight: 700,
            color: TEXT_PRIMARY,
            lineHeight: 1.2,
        }, name),
    ]);
}

/**
 * Description text block with dimmed styling
 */
function __buildDescription(description: string): SatoriElement {
    const truncated = description.length > 300
        ? `${description.slice(0, 297)}...`
        : description;

    return Element(`div`, {
        paddingTop: 4,
        paddingBottom: 4,
        borderLeft: `3px solid ${BORDER_COLOR}`,
        paddingLeft: 12,
    }, [
        Element(`span`, {
            fontSize: FONT_VALUE,
            color: TEXT_SECONDARY,
            lineHeight: 1.5,
        }, truncated),
    ]);
}

/**
 * Properties panel with key-value rows
 */
function __buildPropertiesPanel(
    properties: Array<[string, unknown]>,
): SatoriElement {
    const rows = properties.slice(0, 12).map(([key, value]) => {
        return __buildKeyValueRow(
            FormatPropertyKey(key),
            __formatCardValue(value),
        );
    });

    return __buildPanel(`Properties`, rows);
}

/**
 * Template parameters panel
 */
function __buildParametersPanel(
    parameters: IParameterValue[],
): SatoriElement {
    const rows = parameters.slice(0, 12).map(param => {
        return __buildKeyValueRow(
            FormatPropertyKey(param.key),
            String(param.value),
        );
    });

    return __buildPanel(`Variables`, rows);
}

/**
 * Legacy HAS_PARAMETER parameters panel
 */
function __buildLegacyParametersPanel(
    parameters: Array<[string, string]>,
): SatoriElement {
    const rows = parameters.slice(0, 12).map(([key, value]) => {
        return __buildKeyValueRow(FormatPropertyKey(key), value);
    });

    return __buildPanel(`Parameters`, rows);
}

/**
 * Template actions panel with enabled/disabled indicators
 */
function __buildActionsPanel(
    actions: IActionDefinition[],
    accentColor: string,
): SatoriElement {
    const rows = actions.slice(0, 8).map(action => {
        const statusColor = action.enabled ? `#2ecc71` : `#e74c3c`;
        const statusDot = Element(`div`, {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: statusColor,
            flexShrink: 0,
        });

        const labelText = Element(`span`, {
            fontSize: FONT_LABEL,
            color: TEXT_PRIMARY,
            fontWeight: 500,
        }, action.label);

        const triggerText = Element(`span`, {
            fontSize: FONT_META,
            color: accentColor,
            opacity: 0.7,
        }, FormatPropertyKey(action.trigger));

        return Element(`div`, {
            alignItems: `center`,
            gap: 8,
            paddingTop: 4,
            paddingBottom: 4,
        }, [statusDot, labelText, triggerText]);
    });

    return __buildPanel(`Actions`, rows);
}

/**
 * Generic panel wrapper with title and content rows
 */
function __buildPanel(title: string, rows: SatoriElement[]): SatoriElement {
    return Element(`div`, {
        flexDirection: `column`,
        gap: 4,
        paddingTop: 8,
        paddingBottom: 8,
        borderTop: `2px solid ${BORDER_COLOR}`,
    }, [
        Element(`span`, {
            fontSize: FONT_NAME,
            fontWeight: 600,
            color: TEXT_PRIMARY,
            paddingBottom: 4,
        }, title),
        ...rows,
    ]);
}

/**
 * Single key-value row used in properties and parameters panels
 */
function __buildKeyValueRow(label: string, value: string): SatoriElement {
    return Element(`div`, {
        justifyContent: `space-between`,
        alignItems: `center`,
        paddingTop: 2,
        paddingBottom: 2,
        gap: 16,
    }, [
        Element(`span`, {
            fontSize: FONT_LABEL,
            color: TEXT_SECONDARY,
            fontWeight: 500,
            flexShrink: 0,
        }, label),
        Element(`span`, {
            fontSize: FONT_VALUE,
            color: TEXT_PRIMARY,
            fontFamily: `monospace`,
            textAlign: `right`,
            textOverflow: `ellipsis`,
            overflow: `hidden`,
            maxWidth: `60%`,
        }, value),
    ]);
}

/**
 * Footer with creation and update timestamps
 */
function __buildFooter(detail: ObjectDetail): SatoriElement {
    const parts: SatoriChild[] = [];

    if (detail.createdAt) {
        parts.push(Element(`span`, {
            fontSize: FONT_META,
            color: TEXT_MUTED,
        }, `Created: ${new Date(detail.createdAt).toLocaleDateString()}`));
    }

    if (detail.updatedAt) {
        if (parts.length > 0) {
            parts.push(Element(`span`, {
                fontSize: FONT_META,
                color: TEXT_MUTED,
                paddingLeft: 8,
                paddingRight: 8,
            }, `·`));
        }
        parts.push(Element(`span`, {
            fontSize: FONT_META,
            color: TEXT_MUTED,
        }, `Updated: ${new Date(detail.updatedAt).toLocaleDateString()}`));
    }

    if (parts.length === 0) {
        return Element(`div`, { height: 1 });
    }

    return Element(`div`, {
        justifyContent: `flex-end`,
        alignItems: `center`,
        paddingTop: 8,
        borderTop: `1px solid ${BORDER_COLOR}`,
    }, parts);
}

/**
 * Format any property value to a display string for the card
 */
function __formatCardValue(value: unknown): string {
    if (value === null || value === undefined) {
        return `—`;
    }
    if (typeof value === `boolean`) {
        return value ? `Yes` : `No`;
    }
    if (typeof value === `number`) {
        return String(value);
    }
    if (typeof value === `string`) {
        return value.length > 60 ? `${value.slice(0, 57)}...` : value;
    }
    if (Array.isArray(value)) {
        return value.map(item => String(item)).join(`, `).slice(0, 60);
    }
    return JSON.stringify(value).slice(0, 60);
}
