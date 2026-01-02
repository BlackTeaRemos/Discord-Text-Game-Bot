import type { GameCreateFlowState } from '../../../../Flow/Object/Game/CreateState.js';

/**
 * Generate the heading text rendered above the game preview embed.
 * @param state GameCreateFlowState Current flow state. @example const heading = ResolveGameCreatePreviewHeading(state)
 * @returns string Preview heading aligned with the flow mode. @example 'Preview how your game will appear once created.'
 */
export function ResolveGameCreatePreviewHeading(state: GameCreateFlowState): string {
    return state.mode === `update`
        ? `Preview how your game will appear after saving changes.`
        : `Preview how your game will appear once created.`;
}
