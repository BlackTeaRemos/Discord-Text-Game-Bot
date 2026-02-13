import type { ActionTrigger } from './IActionDefinition.js';
import type { IActionExecutionResult } from './IActionExecutionResult.js';

export interface ITurnActionEngine {
    /**
     * Execute all actions matching the given trigger for every object in a game.
     * Actions are sorted by priority. Parameter mutations are accumulated per-object
     * and persisted after all expressions for that object complete.
     *
     * @param gameUid string Game to process. @example 'game_xyz789'
     * @param trigger ActionTrigger The event type to fire. @example 'onTurnAdvance'
     * @returns Promise<IActionExecutionResult[]> Results for each object-action pair processed.
     */
    Execute(gameUid: string, trigger: ActionTrigger): Promise<IActionExecutionResult[]>;
}
