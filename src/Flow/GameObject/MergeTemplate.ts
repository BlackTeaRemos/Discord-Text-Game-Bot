/**
 * Template merge flow.
 * When a template with the same name is uploaded, merges parameter and action definitions
 * into the existing template and migrates all existing object instances.
 *
 * Merge rules:
 *   Parameters -- new keys are added with default values to all objects.
 *                 Existing keys are kept with current values.
 *                 Removed keys trigger a destructive warning.
 *   Actions    -- new keys are added, updated keys are overwritten.
 *                 Removed keys trigger a destructive warning.
 *
 * Flow:
 *   1. AnalyzeMerge: compare old vs new template, produce a diff report.
 *   2. ExecuteMerge: apply changes to template + propagate to object instances.
 */

import { log } from '../../Common/Log.js';
import type { IGameObjectTemplate } from '../../Domain/GameObject/IGameObjectTemplate.js';
import type { IParameterDefinition } from '../../Domain/GameObject/IParameterDefinition.js';
import type { IParameterValue } from '../../Domain/GameObject/IParameterValue.js';
import type { IActionDefinition } from '../../Domain/GameObject/IActionDefinition.js';
import type { IGameObjectTemplateRepository } from '../../Domain/GameObject/IGameObjectTemplateRepository.js';
import type { IGameObjectRepository } from '../../Domain/GameObject/IGameObjectRepository.js';

/** Log tag for merge operations. */
const LOG_TAG = `Flow/GameObject/MergeTemplate`;

/**
 * Describes a single parameter change in the merge diff.
 */
export interface IParameterDiffEntry {
    /** Parameter key. @example 'productionRate' */
    key: string;

    /** Change type. @example 'added' */
    change: `added` | `removed` | `typeChanged` | `unchanged`;

    /** Old value type (for typeChanged). @example 'number' */
    oldType?: string;

    /** New value type (for typeChanged or added). @example 'string' */
    newType?: string;

    /** Default value for newly added parameters. @example 10 */
    newDefault?: string | number | boolean;
}

/**
 * Describes a single action change in the merge diff.
 */
export interface IActionDiffEntry {
    /** Action key. @example 'produceGoods' */
    key: string;

    /** Change type. @example 'updated' */
    change: `added` | `removed` | `updated` | `unchanged`;
}

/**
 * Full merge analysis report.
 */
export interface IMergeAnalysisResult {
    /** Whether the merge has destructive changes requiring confirmation. @example true */
    hasDestructiveChanges: boolean;

    /** Existing template UID being merged into. @example 'tpl_abc123' */
    existingTemplateUid: string;

    /** Template name. @example 'Factory' */
    templateName: string;

    /** Number of existing object instances affected. @example 5 */
    affectedObjectCount: number;

    /** Per-parameter diff entries. */
    parameterChanges: IParameterDiffEntry[];

    /** Per-action diff entries. */
    actionChanges: IActionDiffEntry[];

    /** List of parameter keys about to be removed (destructive). */
    removedParameterKeys: string[];

    /** List of action keys about to be removed (destructive). */
    removedActionKeys: string[];
}

/**
 * Result of executing a merge.
 */
export interface IMergeExecutionResult {
    /** Whether the merge succeeded. @example true */
    success: boolean;

    /** Number of objects migrated. @example 5 */
    migratedObjectCount: number;

    /** Error message if merge failed. */
    error?: string;
}

/**
 * Analyze the diff between an existing template and new template data.
 * Does NOT modify any data -- read-only analysis.
 * @param existingTemplate IGameObjectTemplate Current template from the database.
 * @param newParameters IParameterDefinition[] Incoming parameter definitions.
 * @param newActions IActionDefinition[] Incoming action definitions.
 * @param objectRepository IGameObjectRepository Repository to count affected objects.
 * @returns Promise<IMergeAnalysisResult> Detailed diff report.
 * @example
 * const analysis = await AnalyzeMerge(existing, newParams, newActions, objectRepo);
 * if (analysis.hasDestructiveChanges) { /* prompt user * / }
 */
export async function AnalyzeMerge(
    existingTemplate: IGameObjectTemplate,
    newParameters: IParameterDefinition[],
    newActions: IActionDefinition[],
    objectRepository: IGameObjectRepository,
): Promise<IMergeAnalysisResult> {
    const existingParamMap = new Map<string, IParameterDefinition>();
    for (const parameter of existingTemplate.parameters) {
        existingParamMap.set(parameter.key, parameter);
    }

    const newParamMap = new Map<string, IParameterDefinition>();
    for (const parameter of newParameters) {
        newParamMap.set(parameter.key, parameter);
    }

    const parameterChanges: IParameterDiffEntry[] = [];

    // Check for removed and changed parameters
    for (const [existingKey, existingParam] of existingParamMap) {
        const newParam = newParamMap.get(existingKey);

        if (!newParam) {
            parameterChanges.push({ key: existingKey, change: `removed` });
        } else if (newParam.valueType !== existingParam.valueType) {
            parameterChanges.push({
                key: existingKey,
                change: `typeChanged`,
                oldType: existingParam.valueType,
                newType: newParam.valueType,
            });
        } else {
            parameterChanges.push({ key: existingKey, change: `unchanged` });
        }
    }

    // Check for added parameters
    for (const [newKey, newParam] of newParamMap) {
        if (!existingParamMap.has(newKey)) {
            parameterChanges.push({
                key: newKey,
                change: `added`,
                newType: newParam.valueType,
                newDefault: newParam.defaultValue,
            });
        }
    }

    // Action diff
    const existingActionMap = new Map<string, IActionDefinition>();
    for (const action of existingTemplate.actions) {
        existingActionMap.set(action.key, action);
    }

    const newActionMap = new Map<string, IActionDefinition>();
    for (const action of newActions) {
        newActionMap.set(action.key, action);
    }

    const actionChanges: IActionDiffEntry[] = [];

    for (const existingKey of existingActionMap.keys()) {
        if (!newActionMap.has(existingKey)) {
            actionChanges.push({ key: existingKey, change: `removed` });
        } else {
            // Compare serialized to detect changes
            const existingAction = existingActionMap.get(existingKey)!;
            const newAction = newActionMap.get(existingKey)!;
            const changed = JSON.stringify(existingAction) !== JSON.stringify(newAction);
            actionChanges.push({ key: existingKey, change: changed ? `updated` : `unchanged` });
        }
    }

    for (const newKey of newActionMap.keys()) {
        if (!existingActionMap.has(newKey)) {
            actionChanges.push({ key: newKey, change: `added` });
        }
    }

    // Count affected objects
    const objects = await objectRepository.ListByGame(existingTemplate.gameUid, {
        templateUid: existingTemplate.uid,
    });

    const removedParameterKeys = parameterChanges
        .filter(entry => {
            return entry.change === `removed`;
        })
        .map(entry => {
            return entry.key;
        });

    const removedActionKeys = actionChanges
        .filter(entry => {
            return entry.change === `removed`;
        })
        .map(entry => {
            return entry.key;
        });

    const hasDestructiveChanges = removedParameterKeys.length > 0
        || removedActionKeys.length > 0
        || parameterChanges.some(entry => {
            return entry.change === `typeChanged`;
        });

    return {
        hasDestructiveChanges,
        existingTemplateUid: existingTemplate.uid,
        templateName: existingTemplate.name,
        affectedObjectCount: objects.length,
        parameterChanges,
        actionChanges,
        removedParameterKeys,
        removedActionKeys,
    };
}

/**
 * Execute a template merge -- update the template definition and migrate all object instances.
 * @param existingTemplate IGameObjectTemplate Current template.
 * @param newParameters IParameterDefinition[] New parameter definitions.
 * @param newActions IActionDefinition[] New action definitions.
 * @param newDescription string New description (optional override).
 * @param templateRepository IGameObjectTemplateRepository Template persistence.
 * @param objectRepository IGameObjectRepository Object instance persistence.
 * @returns Promise<IMergeExecutionResult> Merge outcome.
 * @example
 * const result = await ExecuteMerge(existing, newParams, newActions, 'desc', tplRepo, objRepo);
 */
export async function ExecuteMerge(
    existingTemplate: IGameObjectTemplate,
    newParameters: IParameterDefinition[],
    newActions: IActionDefinition[],
    newDescription: string,
    templateRepository: IGameObjectTemplateRepository,
    objectRepository: IGameObjectRepository,
): Promise<IMergeExecutionResult> {
    try {
        // Step 1: Update the template
        await templateRepository.Update(existingTemplate.uid, {
            description: newDescription,
            parameters: newParameters,
            actions: newActions,
        });

        log.info(`Template "${existingTemplate.name}" definition updated.`, LOG_TAG);

        // Step 2: Migrate all object instances
        const objects = await objectRepository.ListByGame(existingTemplate.gameUid, {
            templateUid: existingTemplate.uid,
        });

        const newParamMap = new Map<string, IParameterDefinition>();
        for (const parameter of newParameters) {
            newParamMap.set(parameter.key, parameter);
        }

        const batchUpdates: Array<{ objectUid: string; parameters: IParameterValue[] }> = [];

        for (const gameObject of objects) {
            const migratedParameters = __MigrateObjectParameters(
                gameObject.parameters,
                newParamMap,
            );

            batchUpdates.push({
                objectUid: gameObject.uid,
                parameters: migratedParameters,
            });
        }

        if (batchUpdates.length > 0) {
            await objectRepository.BatchUpdateParameters(batchUpdates);
            log.info(`Migrated ${batchUpdates.length} objects for template "${existingTemplate.name}".`, LOG_TAG);
        }

        return {
            success: true,
            migratedObjectCount: batchUpdates.length,
        };
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Merge failed for "${existingTemplate.name}": ${message}`, LOG_TAG, `ExecuteMerge`);

        return {
            success: false,
            migratedObjectCount: 0,
            error: message,
        };
    }
}

/**
 * Migrate an object's parameter values to the new template schema.
 * Keeps values for existing keys, adds defaults for new keys, drops removed keys.
 * @param currentParameters IParameterValue[] Object's current parameter values.
 * @param newParamMap Map<string, IParameterDefinition> New parameter definitions keyed by key.
 * @returns IParameterValue[] Migrated parameter values.
 */
function __MigrateObjectParameters(
    currentParameters: IParameterValue[],
    newParamMap: Map<string, IParameterDefinition>,
): IParameterValue[] {
    const currentValueMap = new Map<string, IParameterValue>();
    for (const parameter of currentParameters) {
        currentValueMap.set(parameter.key, parameter);
    }

    const migratedParameters: IParameterValue[] = [];

    for (const [key, definition] of newParamMap) {
        const existingValue = currentValueMap.get(key);

        if (existingValue) {
            // Keep existing value (even if type changed -- value stays as-is)
            migratedParameters.push(existingValue);
        } else {
            // New parameter: use default from definition
            migratedParameters.push({
                key,
                value: definition.defaultValue,
            });
        }
    }

    return migratedParameters;
}
