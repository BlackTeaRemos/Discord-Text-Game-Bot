import type { ObjectDetail } from '../../Flow/Object/FetchObjectDetail.js';
import { Element } from './SatoriElement.js';
import type { SatoriElement, SatoriChild } from './SatoriElement.js';
import {
    CARD_WIDTH,
    FONT_TITLE,
    FONT_SECTION_LABEL,
    FONT_LABEL,
    FONT_META,
    FONT_FAMILY_TITLE,
    FONT_FAMILY_BODY,
    ACTION_DOT_SIZE,
    DESCRIPTION_MAX_HEIGHT,
    ResolveCardStyle,
} from './CardTheme.js';
import { FormatPropertyKey } from '../DetailFormatters/FormatPropertyKey.js';
import { ParseJsonProperty } from '../DetailFormatters/ParseJsonProperty.js';
import type { IParameterValue } from '../../Domain/GameObject/Entity/IParameterValue.js';
import type { IActionDefinition } from '../../Domain/GameObject/Action/IActionDefinition.js';
import type { ITemplateDisplayConfig } from '../../Domain/GameObject/Display/ITemplateDisplayConfig.js';
import { BuildAllTimeSeries } from './SparklineBuilder.js';
import { Translate } from '../../Services/I18nService.js';
import {
    SetCardLayoutStyle,
    GetCardLayoutStyle,
    CalculateLabelColumnWidth,
    BuildSparklineRow,
    FormatCardValue,
} from './CardLayoutShared.js';
import { BuildGroupedParameterSections } from './CardLayoutCharts.js';

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
 * @brief Options for building the card element tree
 */
export interface CardLayoutOptions {
    detail: ObjectDetail;
    accentColor: string;
    accentEmoji: string;
    objectType: string;
    description: string | null;
    locale: string;
    displayConfig?: ITemplateDisplayConfig;
}

/**
 * @brief Build the complete Satori element tree for an object card
 *
 * @param options CardLayoutOptions Data and theming for the card
 * @returns SatoriElement Root element tree ready for Satori rendering
 *
 * @example
 * const tree = BuildCardLayout({ detail, accentColor: '#f97316', locale: 'en', ... });
 */
export function BuildCardLayout(options: CardLayoutOptions): SatoriElement {
    const { detail, accentEmoji, objectType, description, locale, displayConfig } = options;

    SetCardLayoutStyle(ResolveCardStyle(displayConfig?.styleConfig));
    const _style = GetCardLayoutStyle();
    const accentColor = displayConfig?.styleConfig?.accentColor ?? options.accentColor;

    const displayName = String(detail.properties.friendly_name ?? detail.properties.name ?? detail.uid);

    const timeSeriesMap = BuildAllTimeSeries(detail.parameterHistory);

    const sections: SatoriChild[] = [];

    sections.push(__buildHeader(displayName, objectType, accentEmoji, accentColor));

    if (description) {
        const sectionLabel = Translate(`card.sections.description`, { locale, defaultValue: `Information` });
        sections.push(__buildDescription(description, sectionLabel));
    }

    const visibleProperties = Object.entries(detail.properties)
        .filter(([key]) => {
            return !_CARD_HIDDEN_PROPERTIES.has(key) && !_HIDDEN_PROPERTY_PATTERN.test(key);
        });
    if (visibleProperties.length > 0) {
        const sectionLabel = Translate(`card.sections.properties`, { locale, defaultValue: `Properties` });
        sections.push(__buildPropertiesPanel(visibleProperties, timeSeriesMap, sectionLabel, accentColor));
    }

    const templateParams = ParseJsonProperty<IParameterValue[]>(detail.properties.parameters_json);

    if (displayConfig && templateParams && templateParams.length > 0) {
        const groupedSections = BuildGroupedParameterSections(
            templateParams, timeSeriesMap, accentColor, displayConfig, locale,
        );
        sections.push(...groupedSections);
    } else if (templateParams && templateParams.length > 0) {
        const sectionLabel = Translate(`card.sections.parameters`, { locale, defaultValue: `Variables` });
        sections.push(__buildParametersPanel(templateParams, timeSeriesMap, sectionLabel, accentColor));
    }

    const legacyParams = Object.entries(detail.parameters);
    if (legacyParams.length > 0 && (!templateParams || templateParams.length === 0)) {
        const sectionLabel = Translate(`card.sections.parameters`, { locale, defaultValue: `Variables` });
        sections.push(__buildLegacyParametersPanel(legacyParams, timeSeriesMap, sectionLabel, accentColor));
    }

    const templateActions = ParseJsonProperty<IActionDefinition[]>(detail.properties.actions_json);
    if (templateActions && templateActions.length > 0) {
        const sectionLabel = Translate(`card.sections.actions`, { locale, defaultValue: `Actions` });
        sections.push(__buildActionsPanel(templateActions, accentColor, sectionLabel));
    }

    const footer = __buildFooter(detail, locale);
    if (footer) {
        sections.push(footer);
    }

    return Element(`div`, {
        flexDirection: `column`,
        width: CARD_WIDTH,
        backgroundColor: _style.cardBackground,
        borderRadius: _style.cardBorderRadius,
    }, sections);
}

function __buildHeader(
    name: string,
    objectType: string,
    emoji: string,
    accentColor: string,
): SatoriElement {
    const _style = GetCardLayoutStyle();
    return Element(`div`, {
        flexDirection: `column`,
    }, [
        Element(`div`, {
            height: 3,
            width: `100%`,
            backgroundColor: accentColor,
        }),
        Element(`div`, {
            justifyContent: `space-between`,
            alignItems: `center`,
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 16,
            paddingRight: 16,
            backgroundColor: _style.panelBackground,
            borderBottom: `1px solid ${_style.borderColor}`,
        }, [
            Element(`span`, {
                fontSize: FONT_TITLE,
                fontWeight: 700,
                fontFamily: FONT_FAMILY_TITLE,
                color: _style.textPrimary,
                textOverflow: `ellipsis`,
                overflow: `hidden`,
            }, name.toUpperCase()),
            Element(`span`, {
                fontSize: FONT_META,
                fontFamily: FONT_FAMILY_BODY,
                color: _style.textMuted,
            }, `${emoji} ${objectType.toUpperCase()}`),
        ]),
    ]);
}

function __buildDescription(description: string, sectionLabel: string): SatoriElement {
    const _style = GetCardLayoutStyle();
    const truncated = description.length > 500
        ? `${description.slice(0, 497)}...`
        : description;

    return Element(`div`, {
        flexDirection: `column`,
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 16,
        paddingRight: 16,
        borderBottom: `1px solid ${_style.borderColor}`,
        backgroundColor: `${_style.panelBackground}30`,
        maxHeight: DESCRIPTION_MAX_HEIGHT,
        overflow: `hidden`,
    }, [
        Element(`span`, {
            fontSize: FONT_SECTION_LABEL,
            fontWeight: 700,
            fontFamily: FONT_FAMILY_BODY,
            color: _style.textLabel,
            letterSpacing: `0.1em`,
            paddingBottom: 4,
        }, sectionLabel.toUpperCase()),
        Element(`span`, {
            fontSize: FONT_LABEL,
            fontFamily: FONT_FAMILY_BODY,
            color: _style.textSecondary,
            lineHeight: 1.5,
            textAlign: `justify`,
        }, truncated),
    ]);
}

function __buildPropertiesPanel(
    properties: Array<[string, unknown]>,
    timeSeriesMap: Map<string, number[]>,
    sectionLabel: string,
    accentColor: string,
): SatoriElement {
    const visibleItems = properties.slice(0, 12);
    const formattedLabels = visibleItems.map(([key]) => {
        return FormatPropertyKey(key);
    });
    const labelColumnWidth = CalculateLabelColumnWidth(formattedLabels);

    const rows = visibleItems.map(([key, value], index) => {
        const sparklineData = timeSeriesMap.get(key) ?? null;
        return BuildSparklineRow(
            formattedLabels[index],
            FormatCardValue(value),
            sparklineData,
            accentColor,
            labelColumnWidth,
        );
    });

    return __buildSection(sectionLabel, rows);
}

function __buildParametersPanel(
    parameters: IParameterValue[],
    timeSeriesMap: Map<string, number[]>,
    sectionLabel: string,
    accentColor: string,
): SatoriElement {
    const visibleParams = parameters.slice(0, 12);
    const formattedLabels = visibleParams.map(param => {
        return FormatPropertyKey(param.key);
    });
    const labelColumnWidth = CalculateLabelColumnWidth(formattedLabels);

    const rows = visibleParams.map((param, index) => {
        const sparklineData = timeSeriesMap.get(param.key) ?? null;
        return BuildSparklineRow(
            formattedLabels[index],
            String(param.value),
            sparklineData,
            accentColor,
            labelColumnWidth,
        );
    });

    return __buildSection(sectionLabel, rows);
}

function __buildLegacyParametersPanel(
    parameters: Array<[string, string]>,
    timeSeriesMap: Map<string, number[]>,
    sectionLabel: string,
    accentColor: string,
): SatoriElement {
    const visibleParams = parameters.slice(0, 12);
    const formattedLabels = visibleParams.map(([key]) => {
        return FormatPropertyKey(key);
    });
    const labelColumnWidth = CalculateLabelColumnWidth(formattedLabels);

    const rows = visibleParams.map(([key, value], index) => {
        const sparklineData = timeSeriesMap.get(key) ?? null;
        return BuildSparklineRow(formattedLabels[index], value, sparklineData, accentColor, labelColumnWidth);
    });

    return __buildSection(sectionLabel, rows);
}

function __buildActionsPanel(
    actions: IActionDefinition[],
    accentColor: string,
    sectionLabel: string,
): SatoriElement {
    const rows = actions.slice(0, 8).map(action => {
        const _style = GetCardLayoutStyle();
        const statusColor = action.enabled ? `#22c55e` : `#ef4444`;

        return Element(`div`, {
            alignItems: `center`,
            gap: 8,
            paddingTop: 6,
            paddingBottom: 6,
            paddingLeft: 16,
            paddingRight: 16,
            borderBottom: `1px solid ${_style.borderColor}`,
        }, [
            Element(`div`, {
                width: ACTION_DOT_SIZE,
                height: ACTION_DOT_SIZE,
                borderRadius: ACTION_DOT_SIZE / 2,
                backgroundColor: statusColor,
                flexShrink: 0,
            }),
            Element(`span`, {
                fontSize: FONT_LABEL,
                fontFamily: FONT_FAMILY_BODY,
                color: _style.textValue,
                fontWeight: 500,
            }, action.label),
            Element(`span`, {
                fontSize: FONT_META,
                fontFamily: FONT_FAMILY_BODY,
                color: accentColor,
                opacity: 0.7,
            }, FormatPropertyKey(action.trigger)),
        ]);
    });

    return __buildSection(sectionLabel, rows);
}

function __buildSection(title: string, rows: SatoriElement[]): SatoriElement {
    const _style = GetCardLayoutStyle();
    return Element(`div`, {
        flexDirection: `column`,
    }, [
        Element(`div`, {
            paddingTop: 8,
            paddingBottom: 4,
            paddingLeft: 16,
            paddingRight: 16,
            borderBottom: `1px solid ${_style.borderColor}`,
            backgroundColor: _style.panelBackground,
        }, [
            Element(`span`, {
                fontSize: FONT_SECTION_LABEL,
                fontWeight: 700,
                fontFamily: FONT_FAMILY_BODY,
                color: _style.textLabel,
                letterSpacing: `0.1em`,
            }, title.toUpperCase()),
        ]),
        ...rows,
    ]);
}

function __buildFooter(detail: ObjectDetail, locale: string): SatoriElement | null {
    const _style = GetCardLayoutStyle();
    const parts: SatoriChild[] = [];

    const createdLabel = Translate(`card.footer.createdAt`, { locale, defaultValue: `Created` });
    const updatedLabel = Translate(`card.footer.updatedAt`, { locale, defaultValue: `Updated` });

    if (detail.createdAt) {
        parts.push(Element(`span`, {
            fontSize: FONT_META,
            fontFamily: FONT_FAMILY_BODY,
            color: _style.textMuted,
        }, `${createdLabel}: ${new Date(detail.createdAt).toLocaleDateString()}`));
    }

    if (detail.updatedAt) {
        if (parts.length > 0) {
            parts.push(Element(`span`, {
                fontSize: FONT_META,
                fontFamily: FONT_FAMILY_BODY,
                color: _style.textMuted,
                paddingLeft: 8,
                paddingRight: 8,
            }, `·`));
        }
        parts.push(Element(`span`, {
            fontSize: FONT_META,
            fontFamily: FONT_FAMILY_BODY,
            color: _style.textMuted,
        }, `${updatedLabel}: ${new Date(detail.updatedAt).toLocaleDateString()}`));
    }

    if (parts.length === 0) {
        return null;
    }

    return Element(`div`, {
        justifyContent: `flex-end`,
        alignItems: `center`,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: _style.panelBackground,
        borderTop: `1px solid ${_style.borderColor}`,
    }, parts);
}
