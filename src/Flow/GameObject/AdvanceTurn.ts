import { log } from '../../Common/Log.js';
import { UpdateGameTurn } from '../Object/Game/Turn.js';
import { TurnActionEngine } from './TurnActionEngine.js';
import { GameObjectRepository } from '../../Repository/GameObject/GameObjectRepository.js';
import { GameObjectTemplateRepository } from '../../Repository/GameObject/GameObjectTemplateRepository.js';
import type { IActionExecutionResult } from '../../Domain/GameObject/IActionExecutionResult.js';

/** Module-level log tag. */
const LOG_TAG = `Flow/GameObject/AdvanceTurn`;

/**
 * Result of a full turn advance operation.
 */
export interface TurnAdvanceResult {
    /** The new turn number after advancing. @example 4 */
    newTurn: number;

    /** Results from processing object actions. Empty if no objects exist. */
    actionResults: IActionExecutionResult[];

    /** Count of objects that had at least one failed action. @example 0 */
    failedObjectCount: number;

    /** Count of objects processed successfully. @example 12 */
    successfulObjectCount: number;
}

/**
 * Advance the game turn and execute all onTurnAdvance actions.
 * @param gameUid string Game identifier. @example 'game_xyz789'
 * @param currentTurn number The current turn number before advancing. @example 3
 * @returns Promise<TurnAdvanceResult> Complete outcome of the turn advance.
 * @example
 * const result = await AdvanceTurn('game_xyz', 3);
 * // result.newTurn === 4
 * // result.actionResults contains per-object execution details
 */
export async function AdvanceTurn(gameUid: string, currentTurn: number): Promise<TurnAdvanceResult> {
    const newTurn = currentTurn + 1;

    try {
        // Persist the new turn number
        await UpdateGameTurn(gameUid, newTurn);
        log.info(`Turn advanced to ${newTurn} for game "${gameUid}".`, LOG_TAG);

        // Execute all onTurnAdvance actions across game objects
        const objectRepository = new GameObjectRepository();
        const templateRepository = new GameObjectTemplateRepository();
        const turnEngine = new TurnActionEngine(objectRepository, templateRepository);

        const actionResults = await turnEngine.Execute(gameUid, `onTurnAdvance`);

        // Count successes and failures
        const processedObjectUids = new Set<string>();
        const failedObjectUids = new Set<string>();

        for (const result of actionResults) {
            processedObjectUids.add(result.objectUid);

            if (!result.success) {
                failedObjectUids.add(result.objectUid);
            }
        }

        const successfulObjectCount = processedObjectUids.size - failedObjectUids.size;

        if (failedObjectUids.size > 0) {
            log.error(
                `Turn ${newTurn}: ${failedObjectUids.size} objects had action failures.`,
                LOG_TAG,
                `AdvanceTurn`,
            );
        }

        return {
            newTurn,
            actionResults,
            failedObjectCount: failedObjectUids.size,
            successfulObjectCount,
        };
    } catch(error) {
        log.error(`Failed to advance turn for game "${gameUid}": ${String(error)}`, LOG_TAG, `AdvanceTurn`);
        throw error;
    }
}
