/**
 * Utilities for command level permission checks with contextual token resolution
 * @example
 * const result = await EnsureCommandPermission({
 *     context: ExtractFlowContext(interaction),
 *     templates: ['object:game:create:{serverId}'],
 *     additionalContext: { serverId },
 * });
 */
import {
    resolve,
    type PermissionDecision,
    type PermissionToken,
    type PermissionsObject,
    type TokenResolveContext,
    type TokenSegmentInput,
    type ResolveEnsureOptions,
} from '../../Common/Permission/index.js';
import { Log } from '../../Common/Log.js';
import type { IFlowInteractionContext, IFlowMember, FlowMemberProvider } from '../../Common/Type/FlowContext.js';

/**
 * Options for EnsureCommandPermission
 */
export interface EnsureCommandPermissionOptions {
    context: IFlowInteractionContext;
    templates: Array<string | TokenSegmentInput[]>;
    additionalContext?: Record<string, unknown>;
    permissions?: PermissionsObject;
    member?: IFlowMember | null;
    memberProvider?: FlowMemberProvider;
    skipAdminApproval?: boolean;
}

/**
 * Result of EnsureCommandPermission
 */
export interface EnsureCommandPermissionResult {
    allowed: boolean;
    reason?: string;
    tokens: PermissionToken[];
    decision?: PermissionDecision;
}

/**
 * Build base context from flow interaction context
 */
function __BuildBaseContext(context: IFlowInteractionContext): TokenResolveContext {
    const options = Object.fromEntries(
        context.options.map(option => {
            return [option.name, option.value];
        }),
    );
    return {
        commandName: context.commandName,
        guildId: context.guildId,
        userId: context.userId,
        isAdministrator: context.isAdministrator,
        options,
    };
}

/**
 * Ensure a command action is allowed by resolving permission templates against context
 * @param options EnsureCommandPermissionOptions Configuration describing templates and context
 * @returns Promise_EnsureCommandPermissionResult Outcome of the permission check
 * @example
 * const result = await EnsureCommandPermission({
 *     context: ExtractFlowContext(interaction),
 *     templates: ['object:game:create:{serverId}'],
 *     additionalContext: { serverId },
 * });
 */
export async function EnsureCommandPermission(
    options: EnsureCommandPermissionOptions,
): Promise<EnsureCommandPermissionResult> {
    const baseContext = __BuildBaseContext(options.context);
    const mergedContext = { ...baseContext, ...(options.additionalContext ?? {}) } as TokenResolveContext;

    let member: IFlowMember | null = null;
    if (options.member !== undefined) {
        member = options.member;
    } else if (options.memberProvider) {
        try {
            member = await options.memberProvider();
        } catch(error) {
            Log.warning(
                `Failed to fetch member via provider: ${String(error)}`,
                `PermissionGuard`,
                `ensureCommandPermission`,
            );
        }
    }

    const ensureOptions: ResolveEnsureOptions = {
        context: mergedContext,
        permissions: options.permissions,
        skipApproval: Boolean(options.skipAdminApproval),
        member,
    };

    const outcome = await resolve(options.templates, ensureOptions);

    return {
        allowed: outcome.success,
        reason: outcome.detail.reason,
        tokens: outcome.detail.tokens,
        decision: outcome.detail.decision,
    };
}
