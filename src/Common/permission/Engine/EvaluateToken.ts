import ComplexEventEmitter from '../../ComplexEventEmitter.js';
import type { PermissionEvaluationPayload, PermissionToken, PermissionState } from '../Types.js';

/**
 * Evaluates a token against the configured emitter and returns the most specific state
 * @param emitter ComplexEventEmitter of PermissionEvaluationPayload Emitter populated with permission listeners
 * @param token PermissionToken Token under evaluation
 * @returns PermissionState or undefined Resolved permission state if any listener responded
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
