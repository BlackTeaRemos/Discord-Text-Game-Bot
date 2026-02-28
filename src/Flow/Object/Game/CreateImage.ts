import type { GameCreateFlowState } from './CreateState.js';

/**
 * Persist the selected image url inside the flow state
 * @param state GameCreateFlowState Mutable flow state @example SetGameImageUrl(state, 'https://example/image.png')
 * @param imageUrl string Normalized image url chosen by the user @example 'https://cdn.example/image.png'
 * @returns void Nothing
 */
export function SetGameImageUrl(state: GameCreateFlowState, imageUrl: string): void {
    state.imageUrl = imageUrl;
}
