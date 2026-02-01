/**
 * Utilities for command-level permission checks with contextual token resolution.
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
import { log } from '../../Common/Log.js';
import type { IFlowInteractionContext, IFlowMember, FlowMemberProvider } from '../../Common/Type/FlowContext.js';

/**
 * Options for EnsureCommandPermission.
 * @property context IFlowInteractionContext Extracted interaction data.
 * @property templates Array of templates resolved to permission tokens.
 * @property additionalContext Additional context values merged into the resolver context.
 * @property permissions Permission configuration object when available from config.
 * @property member IFlowMember | null | undefined Pre-resolved member data.
 * @property memberProvider FlowMemberProvider | undefined Callback to lazily fetch member.
 * @property skipAdminApproval When true, skip admin approval flow and return immediately.
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
 * Result of EnsureCommandPermission.
 * @property allowed Indicates whether action is permitted (example: true when allowed).
 * @property reason Explanation message when denied (example: 'Explicitly forbidden').
 * @property tokens Tokens evaluated during the check.
 * @property decision Admin decision when approval was requested.
 */
export interface EnsureCommandPermissionResult {
    allowed: boolean;
    reason?: string;
    tokens: PermissionToken[];
    decision?: PermissionDecision;
}

/**
 * Build base context from flow interaction context.
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
 * Ensure a command action is allowed by resolving permission templates against context.
 * @param options EnsureCommandPermissionOptions Configuration describing templates and context.
 * @returns Promise<EnsureCommandPermissionResult> Outcome of the permission check.
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
            log.warning(
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
