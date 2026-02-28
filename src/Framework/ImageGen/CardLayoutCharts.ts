import { Element } from './SatoriElement.js';
import type { SatoriElement } from './SatoriElement.js';
import {
    FONT_LABEL,
    FONT_VALUE,
    FONT_FAMILY_BODY,
    PROPERTY_ROW_HEIGHT,
} from './CardTheme.js';
import { FormatPropertyKey } from '../DetailFormatters/FormatPropertyKey.js';
import type { IParameterValue } from '../../Domain/GameObject/Entity/IParameterValue.js';
import type { ITemplateDisplayConfig } from '../../Domain/GameObject/Display/ITemplateDisplayConfig.js';
import type { IParameterDisplayConfig, ParameterGraphType } from '../../Domain/GameObject/Display/IParameterDisplayConfig.js';
import type { IDisplayChart } from '../../Domain/GameObject/Display/IDisplayChart.js';
import { Translate } from '../../Services/I18nService.js';
import {
    GetCardLayoutStyle,
    CalculateLabelColumnWidth,
    BuildSparklineRow,
    BuildSectionWithIcon,
} from './CardLayoutShared.js';

const _CHART_COLORS = [`#f97316`, `#3b82f6`, `#22c55e`, `#eab308`, `#a855f7`, `#ec4899`, `#06b6d4`, `#ef4444`];

export function BuildGroupedParameterSections(
    parameters: IParameterValue[],
    timeSeriesMap: Map<string, number[]>,
    accentColor: string,
    displayConfig: ITemplateDisplayConfig,
    locale: string,
): SatoriElement[] {
    const paramDisplayMap = new Map<string, IParameterDisplayConfig>();
    for (const paramDisplay of displayConfig.parameterDisplay) {
        paramDisplayMap.set(paramDisplay.key, paramDisplay);
    }

    const sortedGroups = [...displayConfig.groups].sort(
        (groupA, groupB) => {
            return groupA.sortOrder - groupB.sortOrder;
        },
    );

    const groupedParams = new Map<string, IParameterValue[]>();
    for (const group of sortedGroups) {
        groupedParams.set(group.key, []);
    }

    const defaultGroupKey = sortedGroups[0]?.key ?? `general`;
    if (!groupedParams.has(defaultGroupKey)) {
        groupedParams.set(defaultGroupKey, []);
    }

    for (const parameter of parameters) {
        const paramConfig = paramDisplayMap.get(parameter.key);

        if (paramConfig?.hidden) {
            continue;
        }

        const targetGroup = paramConfig?.group ?? defaultGroupKey;
        const targetList = groupedParams.get(targetGroup) ?? groupedParams.get(defaultGroupKey)!;
        targetList.push(parameter);
    }

    for (const paramList of groupedParams.values()) {
        paramList.sort((paramA, paramB) => {
            const orderA = paramDisplayMap.get(paramA.key)?.displayOrder ?? 999;
            const orderB = paramDisplayMap.get(paramB.key)?.displayOrder ?? 999;
            return orderA - orderB;
        });
    }

    const resultSections: SatoriElement[] = [];

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
            const rows = BuildParameterRowsWithConfig(groupParams, timeSeriesMap, accentColor, paramDisplayMap);
            if (rows.length > 0) {
                resultSections.push(BuildSectionWithIcon(group.label, group.iconUrl, rows));
            }
        } else if (item.type === `chart` && item.chart) {
            const chartElement = BuildStandaloneChart(item.chart, parameters, timeSeriesMap, accentColor, paramDisplayMap);
            if (chartElement) {
                resultSections.push(chartElement);
            }
        }
    }

    if (!sortedGroups.some(group => {
        return group.key === defaultGroupKey;
    })) {
        const defaultParams = groupedParams.get(defaultGroupKey);
        if (defaultParams && defaultParams.length > 0) {
            const defaultLabel = Translate(`card.sections.parameters`, { locale, defaultValue: `Variables` });
            const rows = BuildParameterRowsWithConfig(defaultParams, timeSeriesMap, accentColor, paramDisplayMap);
            if (rows.length > 0) {
                resultSections.push(BuildSectionWithIcon(defaultLabel, undefined, rows));
            }
        }
    }

    return resultSections;
}

export function BuildParameterRowsWithConfig(
    parameters: IParameterValue[],
    timeSeriesMap: Map<string, number[]>,
    accentColor: string,
    paramDisplayMap: Map<string, IParameterDisplayConfig>,
): SatoriElement[] {
    const formattedLabels = parameters.map(param => {
        return FormatPropertyKey(param.key);
    });
    const labelColumnWidth = CalculateLabelColumnWidth(formattedLabels);

    return parameters.map((param, index) => {
        const paramConfig = paramDisplayMap.get(param.key);
        const graphType: ParameterGraphType = paramConfig?.graphType ?? `sparkline`;

        const sparklineData = graphType === `none`
            ? null
            : (timeSeriesMap.get(param.key) ?? null);

        return BuildSparklineRow(
            formattedLabels[index],
            String(param.value),
            sparklineData,
            accentColor,
            labelColumnWidth,
            graphType,
        );
    });
}

function BuildStandaloneChart(
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
        const relativeRows = BuildParameterRowsRelative(chartParams, accentColor, paramDisplayMap);
        if (relativeRows.length === 0) {
            return null;
        }
        return BuildSectionWithIcon(chart.label ?? `Chart`, undefined, relativeRows);
    }

    const chartElement = BuildGroupChartElement(
        chartParams, timeSeriesMap, accentColor, chart.chartType, computedHeight,
    );
    if (!chartElement) {
        return null;
    }

    const plainRows = BuildParameterRowsPlain(chartParams, paramDisplayMap);
    const children = [chartElement, ...plainRows];
    return BuildSectionWithIcon(chart.label ?? `Chart`, undefined, children);
}

function BuildGroupChartElement(
    parameters: IParameterValue[],
    timeSeriesMap: Map<string, number[]>,
    accentColor: string,
    mode: `combined` | `cumulative`,
    chartHeight: number,
): SatoriElement | null {
    if (parameters.length === 0) {
        return null;
    }

    const _style = GetCardLayoutStyle();

    const allSeries: number[][] = parameters.map((param) => {
        const series = timeSeriesMap.get(param.key);
        if (series && series.length >= 2) {
            return series;
        }
        const fallbackValue = parseFloat(String(param.value)) || 0;
        return [fallbackValue, fallbackValue];
    });

    let svgContent: string;

    if (mode === `cumulative`) {
        svgContent = BuildCumulativeSvgContent(allSeries, chartHeight);
    } else {
        svgContent = BuildCombinedSvgContent(allSeries, chartHeight);
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

function BuildCombinedSvgContent(allSeries: number[][], chartHeight: number): string {
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

function BuildCumulativeSvgContent(allSeries: number[][], chartHeight: number): string {
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

function BuildParameterRowsPlain(
    parameters: IParameterValue[],
    paramDisplayMap: Map<string, IParameterDisplayConfig>,
): SatoriElement[] {
    const _style = GetCardLayoutStyle();
    const formattedLabels = parameters.map(param => {
        return FormatPropertyKey(param.key);
    });
    const labelColumnWidth = CalculateLabelColumnWidth(formattedLabels);

    return parameters.map((param, index) => {
        return BuildSparklineRow(
            formattedLabels[index],
            String(param.value),
            null,
            _style.accentColor,
            labelColumnWidth,
            `none`,
        );
    });
}

function BuildParameterRowsRelative(
    parameters: IParameterValue[],
    accentColor: string,
    paramDisplayMap: Map<string, IParameterDisplayConfig>,
): SatoriElement[] {
    const formattedLabels = parameters.map(param => {
        return FormatPropertyKey(param.key);
    });
    const labelColumnWidth = CalculateLabelColumnWidth(formattedLabels);

    const groupMaxValue = parameters.reduce((maxAccumulator, currentParam) => {
        const numericValue = Math.abs(parseFloat(String(currentParam.value)) || 0);
        return numericValue > maxAccumulator ? numericValue : maxAccumulator;
    }, 1);

    return parameters.map((param, index) => {
        return BuildRelativeFillRow(
            formattedLabels[index],
            String(param.value),
            accentColor,
            labelColumnWidth,
            groupMaxValue,
        );
    });
}

function BuildRelativeFillRow(
    label: string,
    value: string,
    accentColor: string,
    labelColumnWidth: number,
    groupMaxValue: number,
): SatoriElement {
    const _style = GetCardLayoutStyle();
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
        Element(`div`, {
            position: `absolute`,
            top: 0,
            left: 0,
            bottom: 0,
            width: `${fillPercent.toFixed(1)}%`,
            backgroundColor: accentColor,
            opacity: 0.15,
        }),
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
            marginLeft: 8,
        }, value),
    ]);
}
