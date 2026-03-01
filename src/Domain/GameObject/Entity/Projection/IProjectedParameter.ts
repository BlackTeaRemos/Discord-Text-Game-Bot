import type { IParameterValue } from '../IParameterValue.js';

export type ParameterSource = 'GROUND_TRUTH' | 'ESTIMATED';

/**
 * @brief Organization scoped parameter belief extending IParameterValue with provenance tracking
 * @tparam ParameterSource discriminator for value origin
 */
export interface IProjectedParameter extends IParameterValue {
    /** How this value was obtained @example 'GROUND_TRUTH' */
    source: ParameterSource;

    /** Game turn when this value was last confirmed against reality @example 5 */
    lastConfirmedTurn: number;

    /** Whether the value has drifted beyond the staleness threshold @example false */
    isStale: boolean;
}
