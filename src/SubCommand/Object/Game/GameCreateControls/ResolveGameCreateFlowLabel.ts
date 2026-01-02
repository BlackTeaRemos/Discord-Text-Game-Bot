import type { GameCreateFlowState } from '../../../../Flow/Object/Game/CreateState.js';

/**
 * Resolve a human-readable label describing the current game creation flow.
 * @param state GameCreateFlowState Current flow state. @example const label = ResolveGameCreateFlowLabel(state)
 * @param mode `sentence` | `title` Output format to produce. @example ResolveGameCreateFlowLabel(state, `title`)
 * @returns string Label describing the flow. @example 'game creation'
 */
export function ResolveGameCreateFlowLabel(
    state: GameCreateFlowState,
    mode: `sentence` | `title` = `sentence`,
): string {
    const base = state.mode === `update` ? `game update` : `game creation`;
    if (mode === `title`) {
        return state.mode === `update` ? `Game update` : `Game creation`;
    }
    return base;
}
