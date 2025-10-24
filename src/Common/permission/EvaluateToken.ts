import ComplexEventEmitter from '../ComplexEventEmitter.js';
import type { PermissionEvaluationPayload, PermissionToken, PermissionState } from './types.js';

/**
 * Evaluates a token against the configured emitter and returns the most specific state.
 * @param emitter ComplexEventEmitter<PermissionEvaluationPayload> Emitter populated with permission listeners (example: buildPermissionEmitter({...})).
 * @param token PermissionToken Token under evaluation (example: ['command','create']).
 * @returns PermissionState | undefined Resolved permission state if any listener responded (example: 'allowed').
 * @example
 * const state = evaluateToken(emitter, ['command', 'create']);
 */

export function EvaluateToken(
    emitter: ComplexEventEmitter<PermissionEvaluationPayload>,
    token: PermissionToken,
): PermissionState | undefined {
    const evaluation = { specificity: -1, state: undefined as PermissionState | undefined };
    const payload: PermissionEvaluationPayload = {
        consider: (state, specificity) => {
            if (specificity < evaluation.specificity) {
                return;
            }
            evaluation.specificity = specificity;
            evaluation.state = state;
        },
    };
    emitter.emit(token, payload);
    return evaluation.state;
}
