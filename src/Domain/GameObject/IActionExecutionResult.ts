import type { IParameterValue } from './IParameterValue.js';

export interface IActionExecutionResult {
    /** UID of the game object that was processed. @example 'obj_factory_001' */
    objectUid: string;

    /** Action key that was executed. @example 'produceGoods' */
    actionKey: string;

    /** Whether all expressions in the action completed without error. @example true */
    success: boolean;

    /** Updated parameter values after action execution. */
    updatedParameters: IParameterValue[];

    /** List of expression-level errors if any occurred. Empty on full success. */
    errors: IActionExecutionError[];

    /** ISO timestamp of execution. @example '2026-02-08T15:00:00.000Z' */
    executedAt: string;
}

export interface IActionExecutionError {
    /** The expression that failed. @example 'rawMaterials -= productionRate * 2' */
    expression: string;

    /** Error message describing the failure. @example 'Variable rawMaterials not found in object.' */
    message: string;
}
