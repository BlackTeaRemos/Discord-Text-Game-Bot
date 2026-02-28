import { log } from '../../Common/Log.js';
import type { IGameObjectTemplate } from '../../Domain/GameObject/Entity/IGameObjectTemplate.js';
import type { ITemplateDisplayConfig } from '../../Domain/GameObject/Display/ITemplateDisplayConfig.js';
import type { IParameterDefinition } from '../../Domain/GameObject/Entity/IParameterDefinition.js';
import type { IParameterValue } from '../../Domain/GameObject/Entity/IParameterValue.js';
import type { IActionDefinition } from '../../Domain/GameObject/Action/IActionDefinition.js';
import type { IGameObjectTemplateRepository } from '../../Domain/GameObject/Repository/IGameObjectTemplateRepository.js';
import type { IGameObjectRepository } from '../../Domain/GameObject/Repository/IGameObjectRepository.js';

/** Log tag for merge operations */
const LOG_TAG = `Flow/GameObject/MergeTemplate`;

/**
 * @brief Describes a single parameter change in the merge diff
 */
export interface IParameterDiffEntry {
    /** Parameter key @example 'productionRate' */
    key: string;

    /** Change type @example 'added' */
    change: `added` | `removed` | `typeChanged` | `unchanged`;

    /** Old value type for typeChanged @example 'number' */
    oldType?: string;

    /** New value type for typeChanged or added @example 'string' */
    newType?: string;

    /** Default value for newly added parameters @example 10 */
    newDefault?: string | number | boolean;
}

/**
 * @brief Describes a single action change in the merge diff
 */
export interface IActionDiffEntry {
    /** Action key @example 'produceGoods' */
    key: string;

    /** Change type @example 'updated' */
    change: `added` | `removed` | `updated` | `unchanged`;
}

/**
 * @brief Full merge analysis report
 */
export interface IMergeAnalysisResult {
    /** Whether the merge has destructive changes requiring confirmation @example true */
    hasDestructiveChanges: boolean;

    /** Existing template UID being merged into @example 'tpl_abc123' */
    existingTemplateUid: string;

    /** Template name @example 'Factory' */
    templateName: string;

    /** Number of existing object instances affected @example 5 */
    affectedObjectCount: number;

    /** Per parameter diff entries */
    parameterChanges: IParameterDiffEntry[];

    /** Per action diff entries */
    actionChanges: IActionDiffEntry[];

    /** List of parameter keys about to be removed as destructive changes */
    removedParameterKeys: string[];

    /** List of action keys about to be removed as destructive changes */
    removedActionKeys: string[];
}

/**
 * @brief Result of executing a merge
 */
export interface IMergeExecutionResult {
    /** Whether the merge succeeded @example true */
    success: boolean;

    /** Number of objects migrated @example 5 */
    migratedObjectCount: number;

    /** Error message if merge failed */
    error?: string;
}

/**
 * @brief Analyzes the diff between an existing template and new template data without modifying anything
 * @param existingTemplate IGameObjectTemplate Current template from the database
 * @param newParameters IParameterDefinition array Incoming parameter definitions
 * @param newActions IActionDefinition array Incoming action definitions
 * @param objectRepository IGameObjectRepository Repository to count affected objects
 * @returns IMergeAnalysisResult Detailed diff report
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
 * @brief Executes a template merge updating the template definition and migrating all object instances
 * @param existingTemplate IGameObjectTemplate Current template
 * @param newParameters IParameterDefinition array New parameter definitions
 * @param newActions IActionDefinition array New action definitions
 * @param newDescription string New description optionally overridden
 * @param templateRepository IGameObjectTemplateRepository Template persistence
 * @param objectRepository IGameObjectRepository Object instance persistence
 * @param newDisplayConfig ITemplateDisplayConfig Optional updated display config
 * @returns IMergeExecutionResult Merge outcome
 * @example
 * const result = await ExecuteMerge(existing, newParams, newActions, 'desc', tplRepo, objRepo, displayConfig);
 */
export async function ExecuteMerge(
    existingTemplate: IGameObjectTemplate,
    newParameters: IParameterDefinition[],
    newActions: IActionDefinition[],
    newDescription: string,
    templateRepository: IGameObjectTemplateRepository,
    objectRepository: IGameObjectRepository,
    newDisplayConfig?: ITemplateDisplayConfig,
): Promise<IMergeExecutionResult> {
    try {
        // Update the template
        await templateRepository.Update(existingTemplate.uid, {
            description: newDescription,
            parameters: newParameters,
            actions: newActions,
            ...(newDisplayConfig !== undefined ? { displayConfig: newDisplayConfig } : {}),
        });

        log.info(`Template "${existingTemplate.name}" definition updated.`, LOG_TAG);

        // Migrate all object instances
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
 * @brief Migrates object parameter values to the new template schema
 * @param currentParameters IParameterValue array Current parameter values for the object
 * @param newParamMap Map of string to IParameterDefinition New parameter definitions keyed by key
 * @returns IParameterValue array Migrated parameter values
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
            // Keep existing value even if type changed
            migratedParameters.push(existingValue);
        } else {
            // New parameter uses default from definition
            migratedParameters.push({
                key,
                value: definition.defaultValue,
            });
        }
    }

    return migratedParameters;
}
