/**
 * Turn action engine implementation.
 * On a given trigger event, iterates all game objects for a game,
 * resolves their template actions, and evaluates expression sequences
 * against each object's parameter state.
 *
 * Flow:
 *   1. Load all object instances for the game.
 *   2. For each instance, load its template.
 *   3. Filter template actions by trigger type.
 *   4. Sort by priority (ascending).
 *   5. Evaluate each action's expressions against the instance's parameter state.
 *   6. Collect results and persist updated parameters via batch update.
 */

import { log } from '../../Common/Log.js';
import type { ActionTrigger, IActionDefinition } from '../../Domain/GameObject/IActionDefinition.js';
import type { IActionExecutionResult, IActionExecutionError } from '../../Domain/GameObject/IActionExecutionResult.js';
import type { IGameObject } from '../../Domain/GameObject/IGameObject.js';
import type { IGameObjectTemplate } from '../../Domain/GameObject/IGameObjectTemplate.js';
import type { IParameterValue } from '../../Domain/GameObject/IParameterValue.js';
import type { ITurnActionEngine } from '../../Domain/GameObject/ITurnActionEngine.js';
import type { IGameObjectRepository } from '../../Domain/GameObject/IGameObjectRepository.js';
import type { IGameObjectTemplateRepository } from '../../Domain/GameObject/IGameObjectTemplateRepository.js';
import { ExpressionEvaluator, type CrossObjectState } from './ExpressionEvaluator.js';

/** Module-level tag for logging. */
const LOG_TAG = `Flow/GameObject/TurnActionEngine`;

/**
 * Concrete implementation of the turn action engine.
 * Requires injected repositories to decouple from direct Neo4j imports.
 */
export class TurnActionEngine implements ITurnActionEngine {
    /** Expression evaluator used for action processing. */
    private readonly _evaluator: ExpressionEvaluator;

    /**
     * Create a TurnActionEngine.
     * @param _objectRepository IGameObjectRepository Repository for game object instances.
     * @param _templateRepository IGameObjectTemplateRepository Repository for templates.
     */
    constructor(
        private readonly _objectRepository: IGameObjectRepository,
        private readonly _templateRepository: IGameObjectTemplateRepository,
    ) {
        this._evaluator = new ExpressionEvaluator();
    }

    /**
     * Execute all actions matching the trigger for every object in a game.
     * Builds cross-object state so expressions can reference parameters on other objects
     * via @TemplateName.paramKey syntax.
     * @param gameUid string Game to process.
     * @param trigger ActionTrigger Event type to fire.
     * @returns Promise<IActionExecutionResult[]> Results per object-action pair.
     * @example
     * const results = await engine.Execute('game_xyz', 'onTurnAdvance');
     */
    public async Execute(gameUid: string, trigger: ActionTrigger): Promise<IActionExecutionResult[]> {
        const allResults: IActionExecutionResult[] = [];
        const batchUpdates: Array<{ objectUid: string; parameters: IParameterValue[] }> = [];

        try {
            const objects = await this._objectRepository.ListByGame(gameUid);

            if (objects.length === 0) {
                log.info(`No objects found for game "${gameUid}". Nothing to process.`, LOG_TAG);
                return allResults;
            }

            // Cache templates to avoid redundant fetches
            const templateCache = new Map<string, IGameObjectTemplate>();

            // Pre-resolve all templates and build cross-object state
            for (const gameObject of objects) {
                await this.__ResolveTemplate(gameObject.templateUid, templateCache);
            }

            const crossObjectState = this.__BuildCrossObjectState(objects, templateCache);

            for (const gameObject of objects) {
                const template = templateCache.get(gameObject.templateUid);

                if (!template) {
                    log.warning(`Template "${gameObject.templateUid}" not found for object "${gameObject.uid}". Skipping.`, LOG_TAG);
                    continue;
                }

                const matchingActions = this.__FilterAndSortActions(template.actions, trigger);

                if (matchingActions.length === 0) {
                    continue;
                }

                const objectResults = this.__ExecuteActionsForObject(
                    gameObject,
                    matchingActions,
                    objects,
                    templateCache,
                    crossObjectState,
                    batchUpdates,
                );
                allResults.push(...objectResults);
            }

            // Persist all parameter changes in one transaction
            if (batchUpdates.length > 0) {
                await this._objectRepository.BatchUpdateParameters(batchUpdates);
                log.info(`Persisted parameter updates for ${batchUpdates.length} objects.`, LOG_TAG);
            }
        } catch(error) {
            log.error(`Turn engine execution failed: ${String(error)}`, LOG_TAG, `Execute`);
            throw error;
        }

        return allResults;
    }

    /**
     * Resolve a template by uid, using cache to avoid redundant reads.
     * @param templateUid string Template identifier.
     * @param cache Map<string, IGameObjectTemplate> Local cache.
     * @returns Promise<IGameObjectTemplate | null> Template or null.
     */
    private async __ResolveTemplate(
        templateUid: string,
        cache: Map<string, IGameObjectTemplate>,
    ): Promise<IGameObjectTemplate | null> {
        if (cache.has(templateUid)) {
            return cache.get(templateUid)!;
        }

        const template = await this._templateRepository.GetByUid(templateUid);

        if (template) {
            cache.set(templateUid, template);
        }

        return template;
    }

    /**
     * Filter actions by trigger and sort by priority.
     * @param actions IActionDefinition[] All actions from the template.
     * @param trigger ActionTrigger Target trigger type.
     * @returns IActionDefinition[] Filtered and sorted actions.
     */
    private __FilterAndSortActions(
        actions: IActionDefinition[],
        trigger: ActionTrigger,
    ): IActionDefinition[] {
        return actions
            .filter(action => {
                return action.trigger === trigger && action.enabled;
            })
            .sort((actionA, actionB) => {
                return actionA.priority - actionB.priority;
            });
    }

    /**
     * Execute a list of actions against a single game object.
     * Each expression is individually inspected: if the LHS is an inline target
     * (@Template.param), the expression is applied to all matching remote objects.
     * Local expressions mutate the owning object's state as before.
     * @param gameObject IGameObject The source object instance.
     * @param actions IActionDefinition[] Sorted actions to execute.
     * @param allObjects IGameObject[] All game objects in the game.
     * @param templateCache Map<string, IGameObjectTemplate> Cached templates.
     * @param crossObjectState CrossObjectState Cross-object state for @ references in RHS.
     * @param batchUpdates Array Accumulator for batch persistence updates.
     * @returns IActionExecutionResult[] One result per action.
     */
    private __ExecuteActionsForObject(
        gameObject: IGameObject,
        actions: IActionDefinition[],
        allObjects: IGameObject[],
        templateCache: Map<string, IGameObjectTemplate>,
        crossObjectState: CrossObjectState,
        batchUpdates: Array<{ objectUid: string; parameters: IParameterValue[] }>,
    ): IActionExecutionResult[] {
        const results: IActionExecutionResult[] = [];

        // Build mutable numeric state for the source object (used for local assignments and RHS evaluation)
        const sourceState: Record<string, number> = {};
        for (const parameter of gameObject.parameters) {
            if (typeof parameter.value === `number`) {
                sourceState[parameter.key] = parameter.value;
            } else if (typeof parameter.value === `string`) {
                const parsed = parseFloat(parameter.value);
                if (!isNaN(parsed)) {
                    sourceState[parameter.key] = parsed;
                }
            }
        }

        for (const action of actions) {
            const executionErrors: IActionExecutionError[] = [];
            let actionSucceeded = true;
            /** Track which remote objects were mutated and their states, by uid. */
            const mutatedRemoteStates = new Map<string, { object: IGameObject; state: Record<string, number> }>();

            for (let expressionIndex = 0; expressionIndex < action.expressions.length; expressionIndex++) {
                const expression = action.expressions[expressionIndex];
                const target = this._evaluator.ParseTarget(expression);

                if (target.isInlineTarget && target.templateName && target.remoteKey) {
                    // Inline target: apply expression to all objects of the named template
                    const remoteObjects = this.__FindObjectsByTemplateName(
                        target.templateName,
                        allObjects,
                        templateCache,
                    );

                    if (remoteObjects.length === 0) {
                        executionErrors.push({
                            expression,
                            message: `No objects found for inline target template "${target.templateName}".`,
                        });
                        actionSucceeded = false;
                        break;
                    }

                    for (const remoteObject of remoteObjects) {
                        // Lazily build or reuse the remote object's mutable state
                        let remoteEntry = mutatedRemoteStates.get(remoteObject.uid);
                        if (!remoteEntry) {
                            const remoteState: Record<string, number> = {};
                            for (const parameter of remoteObject.parameters) {
                                if (typeof parameter.value === `number`) {
                                    remoteState[parameter.key] = parameter.value;
                                } else if (typeof parameter.value === `string`) {
                                    const parsed = parseFloat(parameter.value);
                                    if (!isNaN(parsed)) {
                                        remoteState[parameter.key] = parsed;
                                    }
                                }
                            }
                            remoteEntry = { object: remoteObject, state: remoteState };
                            mutatedRemoteStates.set(remoteObject.uid, remoteEntry);
                        }

                        const expressionResult = this._evaluator.Evaluate(
                            sourceState,
                            expression,
                            crossObjectState,
                            remoteEntry.state,
                        );

                        if (!expressionResult.success) {
                            actionSucceeded = false;
                            executionErrors.push({
                                expression,
                                message: expressionResult.error ?? `Unknown error on inline target.`,
                            });
                            break;
                        }
                    }

                    if (!actionSucceeded) {
                        break;
                    }
                } else {
                    // Local expression: mutate the source object's state
                    const expressionResult = this._evaluator.Evaluate(
                        sourceState,
                        expression,
                        crossObjectState,
                    );

                    if (!expressionResult.success) {
                        actionSucceeded = false;
                        executionErrors.push({
                            expression,
                            message: expressionResult.error ?? `Unknown error.`,
                        });
                        break;
                    }
                }
            }

            // Collect updated parameters for the source object
            const updatedSourceParameters: IParameterValue[] = gameObject.parameters.map(parameter => {
                if (parameter.key in sourceState) {
                    return { key: parameter.key, value: sourceState[parameter.key] };
                }
                return { ...parameter };
            });

            results.push({
                objectUid: gameObject.uid,
                actionKey: action.key,
                success: actionSucceeded,
                updatedParameters: updatedSourceParameters,
                errors: executionErrors,
                executedAt: new Date().toISOString(),
            });

            // Queue source object update
            this.__QueueBatchUpdate(batchUpdates, gameObject.uid, updatedSourceParameters);

            // Queue updates for any mutated remote objects
            for (const [remoteUid, remoteEntry] of mutatedRemoteStates) {
                const updatedRemoteParameters: IParameterValue[] = remoteEntry.object.parameters.map(parameter => {
                    if (parameter.key in remoteEntry.state) {
                        return { key: parameter.key, value: remoteEntry.state[parameter.key] };
                    }
                    return { ...parameter };
                });
                this.__QueueBatchUpdate(batchUpdates, remoteUid, updatedRemoteParameters);
            }
        }

        return results;
    }

    /**
     * Find all game objects created from a template with the given name.
     * @param templateName string Template name to match.
     * @param allObjects IGameObject[] All game objects.
     * @param templateCache Map<string, IGameObjectTemplate> Cached templates.
     * @returns IGameObject[] Matching objects.
     */
    private __FindObjectsByTemplateName(
        templateName: string,
        allObjects: IGameObject[],
        templateCache: Map<string, IGameObjectTemplate>,
    ): IGameObject[] {
        return allObjects.filter(gameObject => {
            const template = templateCache.get(gameObject.templateUid);
            return template?.name === templateName;
        });
    }

    /**
     * Queue or replace a batch update entry for an object. Last write wins.
     * @param batchUpdates Array Accumulator array.
     * @param objectUid string Object UID.
     * @param parameters IParameterValue[] Updated parameters.
     */
    private __QueueBatchUpdate(
        batchUpdates: Array<{ objectUid: string; parameters: IParameterValue[] }>,
        objectUid: string,
        parameters: IParameterValue[],
    ): void {
        const existingIndex = batchUpdates.findIndex(entry => {
            return entry.objectUid === objectUid;
        });
        if (existingIndex >= 0) {
            batchUpdates[existingIndex] = { objectUid, parameters };
        } else {
            batchUpdates.push({ objectUid, parameters });
        }
    }

    /**
     * Build the cross-object state map for expression evaluation.
     * Groups all objects by template name, with numeric parameter maps for each object.
     * @param allObjects IGameObject[] All objects in the game.
     * @param templateCache Map<string, IGameObjectTemplate> Cached templates.
     * @returns CrossObjectState Template-name-keyed map of parameter arrays.
     */
    private __BuildCrossObjectState(
        allObjects: IGameObject[],
        templateCache: Map<string, IGameObjectTemplate>,
    ): CrossObjectState {
        const state: CrossObjectState = {};

        for (const gameObject of allObjects) {
            const template = templateCache.get(gameObject.templateUid);

            if (!template) {
                continue;
            }

            if (!state[template.name]) {
                state[template.name] = [];
            }

            const numericParams: Record<string, number> = {};
            for (const parameter of gameObject.parameters) {
                if (typeof parameter.value === `number`) {
                    numericParams[parameter.key] = parameter.value;
                } else if (typeof parameter.value === `string`) {
                    const parsed = parseFloat(parameter.value);
                    if (!isNaN(parsed)) {
                        numericParams[parameter.key] = parsed;
                    }
                }
            }

            state[template.name].push(numericParams);
        }

        return state;
    }

}
