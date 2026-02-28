/**
 * Per-parameter display configuration controlling
 * how an individual parameter appears on the rendered card.
 */
export interface IParameterDisplayConfig {
    /** Parameter key matching IParameterDefinition.key. @example 'productionRate' */
    key: string;

    /** Display group key this parameter belongs to. Matches IDisplayGroup.key. @example 'production' */
    group?: string;

    /** Type of graph visualization displayed behind or alongside the value. @example 'sparkline' */
    graphType: ParameterGraphType;

    /** When true, this parameter is excluded from the card entirely. @example false */
    hidden: boolean;

    /** Sort position within its display group. Lower numbers appear first. @example 0 */
    displayOrder: number;
}

/** Available graph visualization modes for a parameter row. */
export type ParameterGraphType = `sparkline` | `bar` | `none`;
