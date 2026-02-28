import type { ObjectDetail } from '../../Flow/Object/FetchObjectDetail.js';
import { Element } from './SatoriElement.js';
import type { SatoriElement, SatoriChild } from './SatoriElement.js';
import {
    CARD_WIDTH,
    FONT_TITLE,
    FONT_SECTION_LABEL,
    FONT_LABEL,
    FONT_VALUE,
    FONT_META,
    FONT_FAMILY_TITLE,
    FONT_FAMILY_BODY,
    ACTION_DOT_SIZE,
    PROPERTY_ROW_HEIGHT,
    DESCRIPTION_MAX_HEIGHT,
    ResolveCardStyle,
} from './CardTheme.js';
import type { ResolvedCardStyle } from './CardTheme.js';
import { FormatPropertyKey } from '../DetailFormatters/FormatPropertyKey.js';
import { ParseJsonProperty } from '../DetailFormatters/ParseJsonProperty.js';
import type { IParameterValue } from '../../Domain/GameObject/IParameterValue.js';
import type { IActionDefinition } from '../../Domain/GameObject/IActionDefinition.js';
import type { IParameterSnapshot } from '../../Domain/GameObject/IParameterSnapshot.js';
import type { ITemplateDisplayConfig } from '../../Domain/GameObject/ITemplateDisplayConfig.js';
import type { IParameterDisplayConfig, ParameterGraphType } from '../../Domain/GameObject/IParameterDisplayConfig.js';
import type { IDisplayChart } from '../../Domain/GameObject/IDisplayChart.js';
import { BuildAllTimeSeries, BuildSparklineElement } from './SparklineBuilder.js';
import { Translate } from '../../Services/I18nService.js';

/**
 * Approximate width of one uppercase character rendered at FONT_LABEL size in Inter Bold.
 * Used to compute fixed label column widths for value alignment.
 */
const _AVG_UPPERCASE_CHAR_WIDTH = 9;

/** Extra character-widths to insert between the longest label and the value column. */
const _LABEL_GAP_CHARS = 4;

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

/** Module-level resolved style, set at the start of each BuildCardLayout call. Safe in single-threaded Node.js. */
let _style: ResolvedCardStyle;

/**
 * Options for building the card element tree
 * @property detail ObjectDetail Full object detail payload
 * @property accentColor string CSS hex color for accent elements
 * @property accentEmoji string Emoji displayed next to the type badge
 * @property objectType string Display label for the object type
 * @property description string | null Object description text
 * @property locale string Locale code for translating section labels
 * @property displayConfig ITemplateDisplayConfig | undefined Optional display config for grouping and graph control
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
 * Build the complete Satori element tree for an object card
 * Produces a dense dark-themed card matching the PoC visual style
 *
 * @param options CardLayoutOptions Data and theming for the card
 * @returns SatoriElement Root element tree ready for Satori rendering
 *
 * @example
 * const tree = BuildCardLayout({ detail, accentColor: '#f97316', locale: 'en', ... });
 */
export function BuildCardLayout(options: CardLayoutOptions): SatoriElement {
    const { detail, accentEmoji, objectType, description, locale, displayConfig } = options;

    // Resolve visual style: display config overrides > caller accent > theme defaults
    _style = ResolveCardStyle(displayConfig?.styleConfig);
    const accentColor = displayConfig?.styleConfig?.accentColor ?? options.accentColor;

    const displayName = String(detail.properties.friendly_name ?? detail.properties.name ?? detail.uid);

    /** Pre-compute sparkline data from parameter history. */
    const timeSeriesMap = BuildAllTimeSeries(detail.parameterHistory);

    const sections: SatoriChild[] = [];

    // Dense header row: name + type
    sections.push(__buildHeader(displayName, objectType, accentEmoji, accentColor));

    // Description section with translated label
    if (description) {
        const sectionLabel = Translate(`card.sections.description`, { locale, defaultValue: `Information` });
        sections.push(__buildDescription(description, sectionLabel));
    }

    // Properties panel (non-template properties from the node)
    const visibleProperties = Object.entries(detail.properties)
        .filter(([key]) => {
            return !_CARD_HIDDEN_PROPERTIES.has(key) && !_HIDDEN_PROPERTY_PATTERN.test(key);
        });
    if (visibleProperties.length > 0) {
        const sectionLabel = Translate(`card.sections.properties`, { locale, defaultValue: `Properties` });
        sections.push(__buildPropertiesPanel(visibleProperties, timeSeriesMap, sectionLabel, accentColor));
    }

    // Template parameters from parameters_json
    const templateParams = ParseJsonProperty<IParameterValue[]>(detail.properties.parameters_json);

    if (displayConfig && templateParams && templateParams.length > 0) {
        // Display-config-aware grouped rendering
        const groupedSections = __buildGroupedParameterSections(
            templateParams, timeSeriesMap, accentColor, displayConfig, locale,
        );
        sections.push(...groupedSections);
    } else if (templateParams && templateParams.length > 0) {
        // Flat rendering without display config
        const sectionLabel = Translate(`card.sections.parameters`, { locale, defaultValue: `Variables` });
        sections.push(__buildParametersPanel(templateParams, timeSeriesMap, sectionLabel, accentColor));
    }

    // Legacy HAS_PARAMETER parameters (only when no template params exist)
    const legacyParams = Object.entries(detail.parameters);
    if (legacyParams.length > 0 && (!templateParams || templateParams.length === 0)) {
        const sectionLabel = Translate(`card.sections.parameters`, { locale, defaultValue: `Variables` });
        sections.push(__buildLegacyParametersPanel(legacyParams, timeSeriesMap, sectionLabel, accentColor));
    }

    // Template actions from actions_json
    const templateActions = ParseJsonProperty<IActionDefinition[]>(detail.properties.actions_json);
    if (templateActions && templateActions.length > 0) {
        const sectionLabel = Translate(`card.sections.actions`, { locale, defaultValue: `Actions` });
        sections.push(__buildActionsPanel(templateActions, accentColor, sectionLabel));
    }

    // Timestamps footer
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

/**
 * Dense header row with accent bar, type badge, and object name
 * Mirrors the PoC Standard card header layout
 */
function __buildHeader(
    name: string,
    objectType: string,
    emoji: string,
    accentColor: string,
): SatoriElement {
    return Element(`div`, {
        flexDirection: `column`,
    }, [
        // Thin accent bar at top
        Element(`div`, {
            height: 3,
            width: `100%`,
            backgroundColor: accentColor,
        }),
        // Name + type row
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

/**
 * Description section with uppercase label and justified body text
 * Matches the PoC "Information / Specs" block
 */
function __buildDescription(description: string, sectionLabel: string): SatoriElement {
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

/**
 * Properties panel with sparkline-backed rows
 * Each row has a sparkline SVG behind it (when history data exists)
 */
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
    const labelColumnWidth = __calculateLabelColumnWidth(formattedLabels);

    const rows = visibleItems.map(([key, value], index) => {
        const sparklineData = timeSeriesMap.get(key) ?? null;
        return __buildSparklineRow(
            formattedLabels[index],
            __formatCardValue(value),
            sparklineData,
            accentColor,
            labelColumnWidth,
        );
    });

    return __buildSection(sectionLabel, rows);
}

/**
 * Template parameters panel
 */
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
    const labelColumnWidth = __calculateLabelColumnWidth(formattedLabels);

    const rows = visibleParams.map((param, index) => {
        const sparklineData = timeSeriesMap.get(param.key) ?? null;
        return __buildSparklineRow(
            formattedLabels[index],
            String(param.value),
            sparklineData,
            accentColor,
            labelColumnWidth,
        );
    });

    return __buildSection(sectionLabel, rows);
}

/**
 * Legacy HAS_PARAMETER parameters panel
 */
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
    const labelColumnWidth = __calculateLabelColumnWidth(formattedLabels);

    const rows = visibleParams.map(([key, value], index) => {
        const sparklineData = timeSeriesMap.get(key) ?? null;
        return __buildSparklineRow(formattedLabels[index], value, sparklineData, accentColor, labelColumnWidth);
    });

    return __buildSection(sectionLabel, rows);
}

/**
 * Template actions panel with status dots and trigger info
 */
function __buildActionsPanel(
    actions: IActionDefinition[],
    accentColor: string,
    sectionLabel: string,
): SatoriElement {
    const rows = actions.slice(0, 8).map(action => {
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

/**
 * Build parameter sections grouped by display config groups.
 * Parameters are sorted within each group by displayOrder,
 * hidden parameters are excluded, and graph type per parameter is respected.
 *
 * @param parameters IParameterValue[] All template parameter values.
 * @param timeSeriesMap Map<string, number[]> Sparkline data keyed by parameter key.
 * @param accentColor string Card accent color.
 * @param displayConfig ITemplateDisplayConfig Display configuration.
 * @param locale string Locale for section labels.
 * @returns SatoriElement[] One section element per display group.
 */
function __buildGroupedParameterSections(
    parameters: IParameterValue[],
    timeSeriesMap: Map<string, number[]>,
    accentColor: string,
    displayConfig: ITemplateDisplayConfig,
    locale: string,
): SatoriElement[] {
    // Build lookup maps from display config
    const paramDisplayMap = new Map<string, IParameterDisplayConfig>();
    for (const paramDisplay of displayConfig.parameterDisplay) {
        paramDisplayMap.set(paramDisplay.key, paramDisplay);
    }

    // Sort groups by sortOrder
    const sortedGroups = [...displayConfig.groups].sort(
        (groupA, groupB) => {
            return groupA.sortOrder - groupB.sortOrder;
        },
    );

    // Build a map of group key -> visible parameters, sorted by displayOrder
    const groupedParams = new Map<string, IParameterValue[]>();
    for (const group of sortedGroups) {
        groupedParams.set(group.key, []);
    }

    // Default group key for parameters without an explicit group assignment
    const defaultGroupKey = sortedGroups[0]?.key ?? `general`;
    if (!groupedParams.has(defaultGroupKey)) {
        groupedParams.set(defaultGroupKey, []);
    }

    for (const parameter of parameters) {
        const paramConfig = paramDisplayMap.get(parameter.key);

        // Skip hidden parameters
        if (paramConfig?.hidden) {
            continue;
        }

        const targetGroup = paramConfig?.group ?? defaultGroupKey;
        const targetList = groupedParams.get(targetGroup) ?? groupedParams.get(defaultGroupKey)!;
        targetList.push(parameter);
    }

    // Sort each group's parameters by displayOrder
    for (const paramList of groupedParams.values()) {
        paramList.sort((paramA, paramB) => {
            const orderA = paramDisplayMap.get(paramA.key)?.displayOrder ?? 999;
            const orderB = paramDisplayMap.get(paramB.key)?.displayOrder ?? 999;
            return orderA - orderB;
        });
    }

    // Build section elements per group — all groups now use individual per-row rendering
    const resultSections: SatoriElement[] = [];

    // Collect all renderable items (groups + standalone charts) and sort by sortOrder
    interface RenderableItem {
        sortOrder: number;
        type: `group` | `chart`;
        groupKey?: string;
        chart?: IDisplayChart;
    }

    const renderableItems: RenderableItem[] = [];

    for (const group of sortedGroups) {
        const groupParams = groupedParams.get(group.key);
        if (groupParams && groupParams.length > 0) {
            renderableItems.push({ sortOrder: group.sortOrder, type: `group`, groupKey: group.key });
        }
    }

    if (displayConfig.charts && displayConfig.charts.length > 0) {
        for (const chart of displayConfig.charts) {
            renderableItems.push({ sortOrder: chart.sortOrder, type: `chart`, chart });
        }
    }

    renderableItems.sort((itemA, itemB) => {
        return itemA.sortOrder - itemB.sortOrder;
    });

    for (const item of renderableItems) {
        if (item.type === `group` && item.groupKey) {
            const group = sortedGroups.find(groupEntry => {
                return groupEntry.key === item.groupKey;
            })!;
            const groupParams = groupedParams.get(group.key)!;
            const rows = __buildParameterRowsWithConfig(groupParams, timeSeriesMap, accentColor, paramDisplayMap);
            if (rows.length > 0) {
                resultSections.push(__buildSectionWithIcon(group.label, group.iconUrl, rows));
            }
        } else if (item.type === `chart` && item.chart) {
            const chartElement = __buildStandaloneChart(item.chart, parameters, timeSeriesMap, accentColor, paramDisplayMap);
            if (chartElement) {
                resultSections.push(chartElement);
            }
        }
    }

    // Handle any parameters that ended up in an unregistered default group
    if (!sortedGroups.some(group => {
        return group.key === defaultGroupKey;
    })) {
        const defaultParams = groupedParams.get(defaultGroupKey);
        if (defaultParams && defaultParams.length > 0) {
            const defaultLabel = Translate(`card.sections.parameters`, { locale, defaultValue: `Variables` });
            const rows = __buildParameterRowsWithConfig(defaultParams, timeSeriesMap, accentColor, paramDisplayMap);
            if (rows.length > 0) {
                resultSections.push(__buildSectionWithIcon(defaultLabel, undefined, rows));
            }
        }
    }

    return resultSections;
}

/**
 * Build sparkline rows for parameters respecting per-parameter display config.
 * Handles graph type overrides (sparkline, bar, none).
 *
 * @param parameters IParameterValue[] Parameters to render.
 * @param timeSeriesMap Map<string, number[]> Sparkline data.
 * @param accentColor string Accent color.
 * @param paramDisplayMap Map<string, IParameterDisplayConfig> Per-param display config.
 * @returns SatoriElement[] Row elements.
 */
function __buildParameterRowsWithConfig(
    parameters: IParameterValue[],
    timeSeriesMap: Map<string, number[]>,
    accentColor: string,
    paramDisplayMap: Map<string, IParameterDisplayConfig>,
): SatoriElement[] {
    const formattedLabels = parameters.map(param => {
        return FormatPropertyKey(param.key);
    });
    const labelColumnWidth = __calculateLabelColumnWidth(formattedLabels);

    /** Compute the max absolute value in this group for chart reference. */

    return parameters.map((param, index) => {
        const paramConfig = paramDisplayMap.get(param.key);
        const graphType: ParameterGraphType = paramConfig?.graphType ?? `sparkline`;

        // Only pass sparkline data if graphType allows it
        const sparklineData = graphType === `none`
            ? null
            : (timeSeriesMap.get(param.key) ?? null);

        return __buildSparklineRow(
            formattedLabels[index],
            String(param.value),
            sparklineData,
            accentColor,
            labelColumnWidth,
            graphType,
        );
    });
}

/**
 * Section wrapper with optional icon next to the section label.
 * Used for display-config groups that may have an icon URL.
 *
 * @param title string Section title.
 * @param iconUrl string | undefined Optional icon URL.
 * @param rows SatoriElement[] Section content rows.
 * @returns SatoriElement Section element.
 */
function __buildSectionWithIcon(title: string, iconUrl: string | undefined, rows: SatoriElement[]): SatoriElement {
    const headerChildren: SatoriChild[] = [];

    if (iconUrl) {
        headerChildren.push({
            type: `img`,
            props: {
                src: iconUrl,
                style: {
                    display: `flex`,
                    width: 16,
                    height: 16,
                    borderRadius: 2,
                    marginRight: 6,
                },
            },
            key: null,
        });
    }

    headerChildren.push(
        Element(`span`, {
            fontSize: FONT_SECTION_LABEL,
            fontWeight: 700,
            fontFamily: FONT_FAMILY_BODY,
            color: _style.textLabel,
            letterSpacing: `0.1em`,
        }, title.toUpperCase()),
    );

    return Element(`div`, {
        flexDirection: `column`,
    }, [
        Element(`div`, {
            alignItems: `center`,
            paddingTop: 8,
            paddingBottom: 4,
            paddingLeft: 16,
            paddingRight: 16,
            borderBottom: `1px solid ${_style.borderColor}`,
            backgroundColor: _style.panelBackground,
        }, headerChildren),
        ...rows,
    ]);
}

/**
 * Generic section wrapper with uppercase label and divider
 */
function __buildSection(title: string, rows: SatoriElement[]): SatoriElement {
    return Element(`div`, {
        flexDirection: `column`,
    }, [
        // Section header
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
        // Content rows
        ...rows,
    ]);
}

/**
 * Compute fixed label column width from formated label strings.
 * Finds the longest label (uppercased), adds _LABEL_GAP_CHARS of spacing,
 * then converts to approximate pixel width.
 *
 * @param labels string[] Pre-formatted labels (before uppercasing).
 * @returns number Pixel width for the label column.
 */
function __calculateLabelColumnWidth(labels: string[]): number {
    const maxLength = labels.reduce(
        (longest, current) => {
            return Math.max(longest, current.toUpperCase().length);
        },
        0,
    );
    return (maxLength + _LABEL_GAP_CHARS) * _AVG_UPPERCASE_CHAR_WIDTH;
}

/**
 * Single row with sparkline/bar background, fixed-width label, and right-aligned value.
 * Core visual element matching the PoC property rows with graph overlays.
 *
 * @param label string Formatted property key. @example 'Max Health'
 * @param value string Formatted value. @example '100'
 * @param sparklineData number[] | null Time series data or null
 * @param accentColor string Graph stroke/fill color
 * @param labelColumnWidth number Fixed pixel width for the label column
 * @param graphType ParameterGraphType Type of graph visualization. @example 'sparkline'
 * @param groupMaxValue number Max absolute value in the group, used for relative scaling. @example 100
 * @returns SatoriElement Row element
 */
function __buildSparklineRow(
    label: string,
    value: string,
    sparklineData: number[] | null,
    accentColor: string,
    labelColumnWidth: number,
    graphType: ParameterGraphType = `sparkline`,
): SatoriElement {
    const rowChildren: SatoriChild[] = [];

    // Graph background layer (fills entire row)
    if (sparklineData && sparklineData.length >= 2 && graphType !== `none`) {
        if (graphType === `bar`) {
            // Bar chart: render last N values as filled rectangles
            const barElement = __buildBarGraphElement(sparklineData, accentColor);
            if (barElement) {
                rowChildren.push(
                    Element(`div`, {
                        position: `absolute`,
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        opacity: 0.15,
                    }, [barElement]),
                );
            }
        } else {
            // Sparkline: continuous line graph
            const sparkline = BuildSparklineElement(sparklineData, `100%`, PROPERTY_ROW_HEIGHT, accentColor);
            if (sparkline) {
                rowChildren.push(
                    Element(`div`, {
                        position: `absolute`,
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        opacity: 0.15,
                    }, [sparkline]),
                );
            }
        }
    }

    // Text layer on top — fixed label column, value fills remainder
    rowChildren.push(
        Element(`div`, {
            alignItems: `center`,
            width: `100%`,
            paddingLeft: 16,
            paddingRight: 16,
        }, [
            Element(`span`, {
                fontSize: FONT_LABEL,
                fontWeight: 700,
                fontFamily: FONT_FAMILY_BODY,
                color: _style.textLabel,
                width: labelColumnWidth,
                flexShrink: 0,
            }, label.toUpperCase()),
            Element(`span`, {
                fontSize: FONT_VALUE,
                fontWeight: 700,
                fontFamily: FONT_FAMILY_BODY,
                color: _style.textValue,
                backgroundColor: `#00000066`,
                paddingLeft: 4,
                paddingRight: 4,
                borderRadius: 2,
            }, value),
        ]),
    );

    return Element(`div`, {
        position: `relative`,
        height: PROPERTY_ROW_HEIGHT,
        alignItems: `center`,
        borderBottom: `1px solid ${_style.borderColor}`,
        overflow: `hidden`,
    }, rowChildren);
}

/**
 * Build a simple bar graph element from time series data.
 * Renders the last N values as vertical rectangles in an SVG.
 *
 * @param data number[] Time series values.
 * @param accentColor string Bar fill color.
 * @returns SatoriElement | null SVG element or null if insufficient data.
 */
function __buildBarGraphElement(data: number[], accentColor: string): SatoriElement | null {
    if (data.length < 2) {
        return null;
    }

    const barCount = Math.min(data.length, 20);
    const recentData = data.slice(-barCount);
    const maxValue = Math.max(...recentData);
    const minValue = Math.min(...recentData);
    const valueRange = maxValue - minValue || 1;

    const barWidth = 100 / barCount;
    const svgHeight = PROPERTY_ROW_HEIGHT;

    const bars = recentData.map((value, index) => {
        const normalizedHeight = ((value - minValue) / valueRange) * (svgHeight * 0.8);
        const barX = index * barWidth;
        const barY = svgHeight - normalizedHeight;
        return `<rect x="${barX}%" y="${barY}" width="${barWidth * 0.7}%" height="${normalizedHeight}" fill="${accentColor}" rx="1"/>`;
    }).join(``);

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${svgHeight}" preserveAspectRatio="none">${bars}</svg>`;

    return {
        type: `img`,
        props: {
            src: `data:image/svg+xml,${encodeURIComponent(svgContent)}`,
            style: {
                display: `flex`,
                width: `100%`,
                height: svgHeight,
            },
        },
        key: null,
    };
}

/**
 * Build a standalone chart section from an IDisplayChart definition.
 * Resolves the referenced parameters from the full parameter list, then delegates
 * to the appropriate chart builder based on chartType.
 *
 * @param chart IDisplayChart Chart configuration item.
 * @param allParameters IParameterValue[] Full parameter list for the object.
 * @param timeSeriesMap Map<string, number[]> Historical data.
 * @param accentColor string Fallback accent color.
 * @param paramDisplayMap Map<string, IParameterDisplayConfig> Per-param display config.
 * @returns SatoriElement | null Section element containing the chart, or null.
 */
function __buildStandaloneChart(
    chart: IDisplayChart,
    allParameters: IParameterValue[],
    timeSeriesMap: Map<string, number[]>,
    accentColor: string,
    paramDisplayMap: Map<string, IParameterDisplayConfig>,
): SatoriElement | null {
    const paramKeySet = new Set(chart.parameterKeys);
    const chartParams = allParameters.filter(parameter => {
        return paramKeySet.has(parameter.key);
    });

    if (chartParams.length === 0) {
        return null;
    }

    const computedHeight = chart.chartHeight || (40 + chartParams.length * 20);

    if (chart.chartType === `relative`) {
        const relativeRows = __buildParameterRowsRelative(chartParams, accentColor, paramDisplayMap);
        if (relativeRows.length === 0) {
            return null;
        }
        return __buildSectionWithIcon(chart.label ?? `Chart`, undefined, relativeRows);
    }

    const chartElement = __buildGroupChartElement(
        chartParams, timeSeriesMap, accentColor, chart.chartType, computedHeight,
    );
    if (!chartElement) {
        return null;
    }

    const plainRows = __buildParameterRowsPlain(chartParams, paramDisplayMap);
    const children = [chartElement, ...plainRows];
    return __buildSectionWithIcon(chart.label ?? `Chart`, undefined, children);
}

/** Distinct colors for multi-param charts. */
const _CHART_COLORS = [`#f97316`, `#3b82f6`, `#22c55e`, `#eab308`, `#a855f7`, `#ec4899`, `#06b6d4`, `#ef4444`];

/**
 * Build a combined or cumulative SVG chart element for a group of parameters.
 * Combined: overlapping sparklines. Cumulative: stacked areas.
 *
 * @param parameters IParameterValue[] Parameters in the group.
 * @param timeSeriesMap Map<string, number[]> Historical data.
 * @param accentColor string Fallback accent color.
 * @param mode 'combined' | 'cumulative' Chart mode.
 * @returns SatoriElement | null Chart element or null.
 */
function __buildGroupChartElement(
    parameters: IParameterValue[],
    timeSeriesMap: Map<string, number[]>,
    accentColor: string,
    mode: `combined` | `cumulative`,
    chartHeight: number,
): SatoriElement | null {
    if (parameters.length === 0) {
        return null;
    }

    /** Gather time series data for each param (with fallback to single-value). */
    const allSeries: number[][] = parameters.map((param, paramIndex) => {
        const series = timeSeriesMap.get(param.key);
        if (series && series.length >= 2) {
            return series;
        }
        // Single point: create a flat line from the current value
        const fallbackValue = parseFloat(String(param.value)) || 0;
        return [fallbackValue, fallbackValue];
    });

    let svgContent: string;

    if (mode === `cumulative`) {
        svgContent = __buildCumulativeSvgContent(allSeries, chartHeight);
    } else {
        svgContent = __buildCombinedSvgContent(allSeries, chartHeight);
    }

    const svgFull = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${chartHeight}" preserveAspectRatio="none">${svgContent}</svg>`;

    return Element(`div`, {
        width: `100%`,
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 8,
        paddingBottom: 8,
        borderBottom: `1px solid ${_style.borderColor}`,
    }, [{
        type: `img`,
        props: {
            src: `data:image/svg+xml,${encodeURIComponent(svgFull)}`,
            style: {
                display: `flex`,
                width: `100%`,
                height: chartHeight,
                borderRadius: 3,
                backgroundColor: `#00000033`,
            },
        },
        key: null,
    }]);
}

/**
 * Build SVG content for combined (overlapping sparklines) mode.
 */
function __buildCombinedSvgContent(allSeries: number[][], chartHeight: number): string {
    let content = ``;
    for (let seriesIndex = 0; seriesIndex < allSeries.length; seriesIndex++) {
        const data = allSeries[seriesIndex];
        const color = _CHART_COLORS[seriesIndex % _CHART_COLORS.length];
        const minVal = Math.min(...data);
        const maxVal = Math.max(...data);
        const range = maxVal - minVal || 1;
        const points = data.map((value, pointIndex) => {
            const xCoord = (pointIndex / (data.length - 1)) * 100;
            const yCoord = chartHeight - ((value - minVal) / range) * (chartHeight * 0.9);
            return `${xCoord.toFixed(1)},${yCoord.toFixed(1)}`;
        }).join(` `);
        content += `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
    }
    return content;
}

/**
 * Build SVG content for cumulative (stacked area) mode.
 */
function __buildCumulativeSvgContent(allSeries: number[][], chartHeight: number): string {
    // Normalize all series to same length
    const maxLength = Math.max(...allSeries.map(series => {
        return series.length;
    }));
    const normalizedSeries = allSeries.map(series => {
        if (series.length === maxLength) {
            return series;
        }
        const result: number[] = [];
        for (let pointIdx = 0; pointIdx < maxLength; pointIdx++) {
            const sourceIdx = Math.floor((pointIdx / (maxLength - 1)) * (series.length - 1));
            result.push(Math.abs(series[sourceIdx]));
        }
        return result;
    });

    // Compute cumulative sums
    const cumulativeData: number[][] = [];
    for (let layerIdx = 0; layerIdx < normalizedSeries.length; layerIdx++) {
        const stackedRow: number[] = [];
        for (let pointIdx = 0; pointIdx < maxLength; pointIdx++) {
            const previousValue = layerIdx > 0 ? cumulativeData[layerIdx - 1][pointIdx] : 0;
            stackedRow.push(previousValue + normalizedSeries[layerIdx][pointIdx]);
        }
        cumulativeData.push(stackedRow);
    }

    const globalMax = Math.max(...cumulativeData[cumulativeData.length - 1]) || 1;
    let content = ``;

    // Draw from outermost layer inward
    for (let layerIdx = cumulativeData.length - 1; layerIdx >= 0; layerIdx--) {
        const color = _CHART_COLORS[layerIdx % _CHART_COLORS.length];
        let polygonPoints = ``;

        for (let fwdIdx = 0; fwdIdx < maxLength; fwdIdx++) {
            const xPos = (fwdIdx / (maxLength - 1)) * 100;
            const yPos = chartHeight - (cumulativeData[layerIdx][fwdIdx] / globalMax) * (chartHeight * 0.9);
            polygonPoints += `${xPos.toFixed(1)},${yPos.toFixed(1)} `;
        }

        for (let revIdx = maxLength - 1; revIdx >= 0; revIdx--) {
            const xPos = (revIdx / (maxLength - 1)) * 100;
            const yPos = layerIdx > 0
                ? chartHeight - (cumulativeData[layerIdx - 1][revIdx] / globalMax) * (chartHeight * 0.9)
                : chartHeight;
            polygonPoints += `${xPos.toFixed(1)},${yPos.toFixed(1)} `;
        }

        content += `<polygon points="${polygonPoints.trim()}" fill="${color}" opacity="0.5"/>`;
    }

    return content;
}

/**
 * Build plain parameter rows with no graph backgrounds.
 * Used when a group-level chart is rendered above the rows.
 *
 * @param parameters IParameterValue[] Parameters to render.
 * @param paramDisplayMap Map<string, IParameterDisplayConfig> Per-param config.
 * @returns SatoriElement[] Row elements.
 */
function __buildParameterRowsPlain(
    parameters: IParameterValue[],
    paramDisplayMap: Map<string, IParameterDisplayConfig>,
): SatoriElement[] {
    const formattedLabels = parameters.map(param => {
        return FormatPropertyKey(param.key);
    });
    const labelColumnWidth = __calculateLabelColumnWidth(formattedLabels);

    return parameters.map((param, index) => {
        return __buildSparklineRow(
            formattedLabels[index],
            String(param.value),
            null,
            _style.accentColor,
            labelColumnWidth,
            `none`,
        );
    });
}

/**
 * Build parameter rows with relative proportional fill bars.
 * Each row's fill width is proportional to the max absolute value in the group.
 *
 * @param parameters IParameterValue[] Parameters in the group.
 * @param accentColor string Fill bar color.
 * @param paramDisplayMap Map<string, IParameterDisplayConfig> Per-param config.
 * @returns SatoriElement[] Row elements.
 */
function __buildParameterRowsRelative(
    parameters: IParameterValue[],
    accentColor: string,
    paramDisplayMap: Map<string, IParameterDisplayConfig>,
): SatoriElement[] {
    const formattedLabels = parameters.map(param => {
        return FormatPropertyKey(param.key);
    });
    const labelColumnWidth = __calculateLabelColumnWidth(formattedLabels);

    const groupMaxValue = parameters.reduce((maxAccumulator, currentParam) => {
        const numericValue = Math.abs(parseFloat(String(currentParam.value)) || 0);
        return numericValue > maxAccumulator ? numericValue : maxAccumulator;
    }, 1);

    return parameters.map((param, index) => {
        return __buildRelativeFillRow(
            formattedLabels[index],
            String(param.value),
            accentColor,
            labelColumnWidth,
            groupMaxValue,
        );
    });
}

/**
 * Build a single parameter row with a proportional fill bar background.
 * Fill width is relative to the group maximum value.
 *
 * @param label string Formatted label. @example 'PRODUCTION RATE'
 * @param value string Display value. @example '42'
 * @param accentColor string Fill bar color. @example '#f97316'
 * @param labelColumnWidth number Fixed label column width. @example 180
 * @param groupMaxValue number Max value in the group for proportional sizing. @example 100
 * @returns SatoriElement Row element with fill bar.
 */
function __buildRelativeFillRow(
    label: string,
    value: string,
    accentColor: string,
    labelColumnWidth: number,
    groupMaxValue: number,
): SatoriElement {
    const numericValue = Math.abs(parseFloat(value) || 0);
    const fillPercent = Math.min((numericValue / (groupMaxValue || 1)) * 100, 100);

    return Element(`div`, {
        position: `relative`,
        alignItems: `center`,
        paddingLeft: 16,
        paddingRight: 16,
        height: PROPERTY_ROW_HEIGHT,
        borderBottom: `1px solid ${_style.borderColor}`,
    }, [
        // Fill bar background
        Element(`div`, {
            position: `absolute`,
            top: 0,
            left: 0,
            bottom: 0,
            width: `${fillPercent.toFixed(1)}%`,
            backgroundColor: accentColor,
            opacity: 0.15,
        }),
        // Label
        Element(`span`, {
            fontSize: FONT_LABEL,
            fontWeight: 700,
            fontFamily: FONT_FAMILY_BODY,
            color: _style.textLabel,
            width: labelColumnWidth,
            flexShrink: 0,
        }, label.toUpperCase()),
        // Value
        Element(`span`, {
            fontSize: FONT_VALUE,
            fontWeight: 700,
            fontFamily: FONT_FAMILY_BODY,
            color: _style.textValue,
            backgroundColor: `#00000066`,
            paddingLeft: 4,
            paddingRight: 4,
            borderRadius: 2,
            marginLeft: 8,
        }, value),
    ]);
}

/**
 * Footer with creation and update timestamps
 */
function __buildFooter(detail: ObjectDetail, locale: string): SatoriElement | null {
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
        return Number.isInteger(value) ? String(value) : value.toFixed(1);
    }
    if (typeof value === `string`) {
        return value.length > 60 ? `${value.slice(0, 57)}...` : value;
    }
    if (Array.isArray(value)) {
        return value.map(item => {
            return String(item);
        }).join(`, `).slice(0, 60);
    }
    return JSON.stringify(value).slice(0, 60);
}
