import type { ActionTrigger } from './IActionDefinition.js';
import type { IActionExecutionResult } from './IActionExecutionResult.js';

export interface ITurnActionEngine {
    /**
     * Execute all priority sorted actions for the given trigger across every object in a game
     *
     * @param gameUid string Game to process @example 'game_xyz789'
     * @param trigger ActionTrigger The event type to fire @example 'onTurnAdvance'
     * @returns IActionExecutionResult array Results for each object action pair
     */
    Execute(gameUid: string, trigger: ActionTrigger): Promise<IActionExecutionResult[]>;
}
