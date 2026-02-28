import { Element } from './SatoriElement.js';
import type { SatoriElement, SatoriChild } from './SatoriElement.js';
import type { ResolvedCardStyle } from './CardTheme.js';
import {
    FONT_SECTION_LABEL,
    FONT_LABEL,
    FONT_VALUE,
    FONT_FAMILY_BODY,
    PROPERTY_ROW_HEIGHT,
} from './CardTheme.js';
import type { ParameterGraphType } from '../../Domain/GameObject/IParameterDisplayConfig.js';
import { BuildSparklineElement } from './SparklineBuilder.js';

const _AVG_UPPERCASE_CHAR_WIDTH = 9;

const _LABEL_GAP_CHARS = 4;

let _style: ResolvedCardStyle;

export function SetCardLayoutStyle(style: ResolvedCardStyle): void {
    _style = style;
}

export function GetCardLayoutStyle(): ResolvedCardStyle {
    return _style;
}

export function CalculateLabelColumnWidth(labels: string[]): number {
    const maxLength = labels.reduce(
        (longest, current) => {
            return Math.max(longest, current.toUpperCase().length);
        },
        0,
    );
    return (maxLength + _LABEL_GAP_CHARS) * _AVG_UPPERCASE_CHAR_WIDTH;
}

export function FormatCardValue(value: unknown): string {
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

export function BuildBarGraphElement(data: number[], accentColor: string): SatoriElement | null {
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

export function BuildSparklineRow(
    label: string,
    value: string,
    sparklineData: number[] | null,
    accentColor: string,
    labelColumnWidth: number,
    graphType: ParameterGraphType = `sparkline`,
): SatoriElement {
    const rowChildren: SatoriChild[] = [];

    if (sparklineData && sparklineData.length >= 2 && graphType !== `none`) {
        if (graphType === `bar`) {
            const barElement = BuildBarGraphElement(sparklineData, accentColor);
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

export function BuildSectionWithIcon(title: string, iconUrl: string | undefined, rows: SatoriElement[]): SatoriElement {
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
