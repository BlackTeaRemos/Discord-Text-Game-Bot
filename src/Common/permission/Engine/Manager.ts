import type { IFlowMember } from '../../Type/FlowContext.js';
import { BuildPermissionEmitter } from './BuildPermissionEmitter.js';
import { HasPermanentGrant } from '../Store.js';
import type { PermissionCheckResult, PermissionState, PermissionTokenInput, PermissionsObject } from '../Types.js';
import { NormalizeToken } from '../Token/NormalizeToken.js';
import { FormatPermissionToken } from './FormatPermissionToken.js';
import { EvaluateToken } from './EvaluateToken.js';
/**
 * @brief Translates a permission state into a standardized permission check result
 * @param state PermissionState Evaluated permission state example once
 * @param formattedToken string Token presented to humans example command_create
 * @returns PermissionCheckResult Result object matching the state
 * @example
 * const result = computeStateResult('allowed', 'command:create');
 */
function ComputeStateResult(state: PermissionState, formattedToken: string): PermissionCheckResult {
    if (state === `allowed`) {
        return { allowed: true };
    }
    if (state === `once`) {
        return {
            allowed: false,
            requiresApproval: true,
            missing: [formattedToken],
            reason: `Requires one-time approval`,
        };
    }
    if (state === `forbidden`) {
        return {
            allowed: false,
            requiresApproval: false,
            missing: [formattedToken],
            reason: `Explicitly forbidden`,
        };
    }
    return { allowed: false, requiresApproval: true, missing: [formattedToken], reason: `Token(s) not defined` };
}

/**
 * @brief Evaluates whether a guild member holds permissions for provided tokens
 * @param permissions PermissionsObject or undefined Permission configuration object
 * @param member IFlowMember or null Flow member requesting the action
 * @param tokens PermissionTokenInput array Candidate tokens to evaluate
 * @returns PermissionCheckResult Promise resolving to permission check outcome
 * @example
 * const result = await checkPermission(config.permissions, member, ['command:create']);
 */
export async function CheckPermission(
    permissions: PermissionsObject | undefined,
    member: IFlowMember | null,
    tokens: PermissionTokenInput[],
): Promise<PermissionCheckResult> {
    try {
        // Temporarily disabled admin approval bypass so approval flows and audit paths can be tested
        // if (member && member.permissions?.has && member.permissions.has('Administrator')) {
        //     return { allowed: true };
        // }

        const guildId = member?.guildId;
        const userId = member?.id;

        if (HasPermanentGrant(guildId, userId, tokens)) {
            return { allowed: true };
        }

        if (!permissions || Object.keys(permissions).length === 0) {
            return { allowed: false, requiresApproval: true, reason: `No explicit permissions configured` };
        }

        const emitter = BuildPermissionEmitter(permissions);
        const missing: string[] = []; // list of tokens requiring approval

        for (const tokenInput of tokens) {
            const token = NormalizeToken(tokenInput);
            if (!token.length) {
                continue;
            }
            const formatted = FormatPermissionToken(token);
            const state = EvaluateToken(emitter, token);
            if (!state || state === `undefined`) {
                missing.push(formatted);
                continue;
            }
            const result = ComputeStateResult(state, formatted);
            if (result.allowed) {
                return result;
            }
            if (state === `once` || state === `forbidden`) {
                return result;
            }
        }

        return {
            allowed: false,
            requiresApproval: true,
            missing: missing.length ? missing : undefined,
            reason: missing.length ? `Token(s) not defined` : undefined,
        };
    } catch(err: any) {
        return { allowed: false, reason: `Permission check error: ${String(err)}` };
    }
}
