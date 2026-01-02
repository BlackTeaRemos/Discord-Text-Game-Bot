import type { GameCreateFlowState } from '../../../../Flow/Object/Game/CreateState.js';

/**
 * Produce the success message shared when the game flow completes.
 * @param state GameCreateFlowState Current flow state. @example ResolveGameCreateSuccessMessage(state, 'Galaxy League')
 * @param gameName string Name of the game affected. @example ResolveGameCreateSuccessMessage(state, game.name)
 * @returns string Success message referencing the game name. @example 'Game Galaxy League created successfully.'
 */
export function ResolveGameCreateSuccessMessage(state: GameCreateFlowState, gameName: string): string {
    const action = state.mode === `update` ? `updated` : `created`;
    return `Game ${gameName} ${action} successfully.`;
}
