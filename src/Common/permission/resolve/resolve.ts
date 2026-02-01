import { log } from '../../Log.js';
import { CheckPermission } from '../manager.js';
import type { PermissionToken, PermissionTokenInput } from '../types.js';
import type { ResolveEnsureOptions, ResolveEnsureResult } from './types.js';
import type { IFlowMember } from '../../Type/FlowContext.js';
import { CollectEnsureTokens } from './collectEnsureTokens.js';
import { ToInputs } from './toInputs.js';

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
 *   member: flowMember,
 *   requestApproval: async (payload) => 'approve_once'
 * });
 * if (result.success) {
 *   // Permission granted, proceed with action
 * }
 */
export async function Resolve(
    templates: Array<string | import('../types.js').TokenSegmentInput[]>,
    options: ResolveEnsureOptions = {},
): Promise<ResolveEnsureResult> {
    try {
        const context = (options.context ?? {}) as import('./types.js').TokenResolveContext;
        const tokens = CollectEnsureTokens(templates, context);

        log.debug(
            `Permission.Resolve: collected ${tokens.length} tokens from ${templates.length} templates`,
            `Permission.Resolve`,
            JSON.stringify({ tokens, hasApprovalCallback: !!options.requestApproval }),
        );

        if (tokens.length === 0) {
            return { success: true, detail: { tokens } };
        }

        let member: IFlowMember | null | undefined = options.member;
        if (member === undefined && options.getMember) {
            member = await options.getMember();
        }

        const inputs: PermissionTokenInput[] = ToInputs(tokens);
        const evaluation = await CheckPermission(options.permissions, member ?? null, inputs);

        log.debug(
            `Permission.Resolve: evaluation result`,
            `Permission.Resolve`,
            JSON.stringify({
                allowed: evaluation.allowed,
                requiresApproval: evaluation.requiresApproval,
                reason: evaluation.reason,
                skipApproval: options.skipApproval,
                hasRequestApproval: !!options.requestApproval,
            }),
        );

        if (evaluation.allowed) {
            return { success: true, detail: { tokens, requiresApproval: !!evaluation.requiresApproval } };
        }

        if (!evaluation.requiresApproval || options.skipApproval || !options.requestApproval) {
            log.debug(
                `Permission.Resolve: skipping approval flow`,
                `Permission.Resolve`,
                JSON.stringify({
                    requiresApproval: evaluation.requiresApproval,
                    skipApproval: options.skipApproval,
                    hasRequestApproval: !!options.requestApproval,
                }),
            );
            return {
                success: false,
                detail: {
                    tokens,
                    reason: evaluation.reason ?? `Permission denied`,
                    requiresApproval: !!evaluation.requiresApproval,
                },
            };
        }

        log.debug(`Permission.Resolve: requesting admin approval`, `Permission.Resolve`, JSON.stringify({ tokens }));
        const decision = await options.requestApproval({ tokens, reason: evaluation.reason } as any);
        log.debug(`Permission.Resolve: admin decision received`, `Permission.Resolve`, JSON.stringify({ decision }));

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
