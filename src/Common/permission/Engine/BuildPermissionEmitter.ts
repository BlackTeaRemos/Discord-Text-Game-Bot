import ComplexEventEmitter from '../../ComplexEventEmitter.js';
import type { PermissionEvaluationPayload, PermissionsObject } from '../Types.js';
import { NormalizeToken } from '../Token/NormalizeToken.js';

/**
 * Builds a ComplexEventEmitter instance populated with permission listeners
 * @param permissions PermissionsObject Map containing token strings and associated states
 * @returns ComplexEventEmitter of PermissionEvaluationPayload Configured emitter used during evaluation
 */
export function BuildPermissionEmitter(
    permissions: PermissionsObject,
): ComplexEventEmitter<PermissionEvaluationPayload> {
    const emitter = new ComplexEventEmitter<PermissionEvaluationPayload>();
    for (const [rawToken, state] of Object.entries(permissions)) {
        if (!state || state === `undefined`) {
            continue;
        }
        const token = NormalizeToken(rawToken);
        if (!token.length) {
            continue;
        }
        const specificity = token.length;
        emitter.on(token, payload => {
            return payload.consider(state, specificity);
        });
    }
    return emitter;
}
