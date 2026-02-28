import type { IParameterSnapshot } from '../../Domain/GameObject/Entity/IParameterSnapshot.js';
import type { SatoriElement } from './SatoriElement.js';
import { ACCENT_COLOR } from './CardTheme.js';

/**
 * Extracted numeric time series for a single parameter key across snapshots
 */
export interface ParameterTimeSeries {
    key: string;
    dataPoints: number[];
}

/**
 * Extract numeric time series from parameter snapshots for a given key
 * Snapshots are expected newest first as returned by GetRecentSnapshots
 * Output is oldest first for natural left to right sparkline rendering
 *
 * @param snapshots IParameterSnapshot array Snapshots ordered newest first
 * @param parameterKey string The parameter key to extract
 * @returns number array Data points ordered oldest first or empty if key not found
 *
 * @example
 * ExtractTimeSeries(snapshots, 'health') // [100, 95, 88, 72]
 */
export function ExtractTimeSeries(
    snapshots: IParameterSnapshot[],
    parameterKey: string,
): number[] {
    const dataPoints: number[] = [];

    /** Iterate in reverse to produce oldest first ordering */
    for (let snapshotIndex = snapshots.length - 1; snapshotIndex >= 0; snapshotIndex--) {
        const snapshot = snapshots[snapshotIndex];
        const parameter = snapshot.parameters.find(param => {
            return param.key === parameterKey;
        });

        if (!parameter) {
            continue;
        }

        const numericValue = typeof parameter.value === `number`
            ? parameter.value
            : parseFloat(String(parameter.value));

        if (!isNaN(numericValue)) {
            dataPoints.push(numericValue);
        }
    }

    return dataPoints;
}

/**
 * Build all available time series from snapshots keyed by parameter name
 * Only includes keys that have at least 2 numeric data points as minimum for a line
 *
 * @param snapshots IParameterSnapshot array Snapshots ordered newest first
 * @returns Map of string to number array Parameter key to oldest first data points
 *
 * @example
 * const seriesMap = BuildAllTimeSeries(snapshots);
 * // Map { 'health' => [100, 95, 88], 'gold' => [50, 75, 120] }
 */
export function BuildAllTimeSeries(
    snapshots: IParameterSnapshot[],
): Map<string, number[]> {
    if (snapshots.length < 2) {
        return new Map();
    }

    /** Collect all unique numeric parameter keys from the most recent snapshot */
    const latestSnapshot = snapshots[0];
    const candidateKeys: string[] = [];

    for (const parameter of latestSnapshot.parameters) {
        const numericValue = typeof parameter.value === `number`
            ? parameter.value
            : parseFloat(String(parameter.value));

        if (!isNaN(numericValue)) {
            candidateKeys.push(parameter.key);
        }
    }

    const seriesMap = new Map<string, number[]>();

    for (const key of candidateKeys) {
        const series = ExtractTimeSeries(snapshots, key);
        if (series.length >= 2) {
            seriesMap.set(key, series);
        }
    }

    return seriesMap;
}

/**
 * Build an inline SVG sparkline element compatible with Satori rendering
 * Produces an SVG polyline within a 100x100 viewBox scaled to fit the container
 * Mirrors the temp POC MicroGraph component logic
 *
 * @param dataPoints number array Numeric values ordered oldest first with minimum 2 points required
 * @param width number or string SVG container width
 * @param height number or string SVG container height
 * @param strokeColor string Line stroke color
 * @returns SatoriElement or null SVG element tree or null if insufficient data
 *
 * @example
 * const sparkline = BuildSparklineElement([100, 95, 88, 72], 80, 20);
 */
export function BuildSparklineElement(
    dataPoints: number[],
    width: number | string = 80,
    height: number | string = 20,
    strokeColor: string = ACCENT_COLOR,
): SatoriElement | null {
    if (!dataPoints || dataPoints.length < 2) {
        return null;
    }

    const minValue = Math.min(...dataPoints);
    const maxValue = Math.max(...dataPoints);
    const valueRange = maxValue - minValue || 1;

    /** Build SVG polyline points string in 100x100 viewBox coordinates */
    const pointSegments: string[] = [];
    for (let pointIndex = 0; pointIndex < dataPoints.length; pointIndex++) {
        const xCoordinate = (pointIndex / (dataPoints.length - 1)) * 100;
        const yCoordinate = 100 - ((dataPoints[pointIndex] - minValue) / valueRange) * 100;
        pointSegments.push(`${xCoordinate.toFixed(1)},${yCoordinate.toFixed(1)}`);
    }

    const pointsString = pointSegments.join(` `);

    /**
     * Satori accepts SVG elements as plain objects with type svg or polyline
     * Build a minimal SVG with a single polyline stroke
     */
    const polylineElement: SatoriElement = {
        type: `polyline`,
        props: {
            points: pointsString,
            fill: `none`,
            stroke: strokeColor,
            'stroke-width': `3`,
            'vector-effect': `non-scaling-stroke`,
        },
        key: null,
    };

    const svgElement: SatoriElement = {
        type: `svg`,
        props: {
            width: String(width),
            height: String(height),
            viewBox: `0 0 100 100`,
            preserveAspectRatio: `none`,
            style: { display: `flex`, opacity: 0.7 },
            children: polylineElement,
        },
        key: null,
    };

    return svgElement;
}
