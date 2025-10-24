import type { Game } from './CreateRecord.js';
import { CreateGame } from './CreateRecord.js';
import type { GameCreateFlowState } from './CreateState.js';
import { GameCreateFlowConstants } from './CreateState.js';
import { log } from '../../../Common/Log.js';

export interface GameCreateFinalizationResult {
    success: boolean;
    game?: Game;
    error?: string;
}

/**
 * Persist the configured game using the gathered flow state.
 * @param state GameCreateFlowState Mutable flow state. @example await FinalizeGameCreation(state)
 * @returns Promise<GameCreateFinalizationResult> Outcome describing persistence status.
 */
export async function FinalizeGameCreation(state: GameCreateFlowState): Promise<GameCreateFinalizationResult> {
    const trimmedName = state.gameName.trim();
    if (!trimmedName) {
        return { success: false, error: `Set a name before creating the game.` };
    }
    try {
        const created = await CreateGame(trimmedName, state.imageUrl ?? ``, state.serverId, undefined, {
            currentTurn: 1,
            description: state.description,
        });
        return { success: true, game: created };
    } catch (error) {
        log.error(`Game creation failed: ${String(error)}`, GameCreateFlowConstants.logSource, `FinalizeGameCreation`);
        return { success: false, error: String(error) };
    }
}
