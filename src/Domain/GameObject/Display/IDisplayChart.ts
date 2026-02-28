/**
 * Standalone chart display item that visualizes multiple parameters together.
 * Charts are rendered independently from parameter groups as distinct visual blocks.
 */
export interface IDisplayChart {
    /** Unique identifier for this chart. @example 'chart_production' */
    key: string;

    /** Optional heading rendered above the chart. @example 'Production Overview' */
    label?: string;

    /**
     * Chart visualization type.
     * - `combined`: overlapping colored polylines for each parameter.
     * - `cumulative`: stacked area chart where each parameter fills on top.
     * - `relative`: horizontal proportional bars comparing values.
     * @example 'combined'
     */
    chartType: DisplayChartType;

    /** Parameter keys included in this chart. Order determines layering/legend. @example ['productionRate', 'income'] */
    parameterKeys: string[];

    /**
     * Override chart height in pixels.
     * When omitted, height scales with parameter count: base 40 + (paramCount * 20).
     * @example 120
     */
    chartHeight?: number;

    /** Vertical sort position relative to groups. Lower numbers appear first. @example 5 */
    sortOrder: number;
}

/**
 * Available chart visualization types for multi-parameter display.
 */
export type DisplayChartType = `combined` | `cumulative` | `relative`;
