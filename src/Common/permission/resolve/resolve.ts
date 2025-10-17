import { log } from '../../Log.js';
import { checkPermission } from '../manager.js';
import type { PermissionToken, PermissionTokenInput } from '../types.js';
import type { ResolveEnsureOptions, ResolveEnsureResult } from './types.js';
import { collectEnsureTokens } from './collectEnsureTokens.js';
import { toInputs } from './toInputs.js';

/**
 * Resolves permission templates into tokens, evaluates them against the provided permissions,
 * and handles approval workflows for denied but approvable permissions.
 *
 * This function takes permission templates (strings or arrays), substitutes placeholders using context,
 * checks if the user has permission, and if not, can request approval from administrators.
 * It returns a result indicating success or failure, along with details like tokens and reasons.
 *
 * @param templates - Array of permission templates to resolve and check
 * @param options - Configuration options including context, permissions, member, and approval callbacks
 * @returns Promise resolving to permission resolution result
 *
 * @example
 * const result = await resolve(['command:{action}'], {
 *   context: { action: 'ban' },
 *   permissions: { 'command:ban': 'once' },
 *   member: guildMember,
 *   requestApproval: async (payload) => 'approve_once'
 * });
 * if (result.success) {
 *   // Permission granted, proceed with action
 * }
 */
export async function resolve(
    templates: Array<string | import('../types.js').TokenSegmentInput[]>,
    options: ResolveEnsureOptions = {},
): Promise<ResolveEnsureResult> {
    try {
        const context = (options.context ?? {}) as import('./types.js').TokenResolveContext;
        const tokens = collectEnsureTokens(templates, context);

        if (tokens.length === 0) {
            return { success: true, detail: { tokens } };
        }

        let member: import('discord.js').GuildMember | null | undefined = options.member;
        if (member === undefined && options.getMember) {
            member = await options.getMember();
        }

        const inputs: PermissionTokenInput[] = toInputs(tokens);
        const evaluation = await checkPermission(options.permissions, member ?? null, inputs);

        if (evaluation.allowed) {
            return { success: true, detail: { tokens, requiresApproval: !!evaluation.requiresApproval } };
        }

        if (!evaluation.requiresApproval || options.skipApproval || !options.requestApproval) {
            return {
                success: false,
                detail: {
                    tokens,
                    reason: evaluation.reason ?? `Permission denied`,
                    requiresApproval: !!evaluation.requiresApproval,
                },
            };
        }

        const decision = await options.requestApproval({ tokens, reason: evaluation.reason } as any);

        if (decision === `approve_once` || decision === `approve_forever`) {
            return { success: true, detail: { tokens, decision } };
        }

        return {
            success: false,
            detail: {
                tokens,
                decision,
                reason: evaluation.reason ?? `Permission denied`,
            },
        };
    } catch(error) {
        log.error(`doEnsure failed: ${String(error)}`, `Permission.doEnsure`);
        return {
            success: false,
            detail: {
                tokens: [],
                reason: `Permission resolution error: ${String(error)}`,
            },
        };
    }
}
