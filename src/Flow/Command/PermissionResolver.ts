import {
    resolve,
    type PermissionDecision,
    type PermissionToken,
    type PermissionsObject,
    type TokenSegmentInput,
    type TokenResolveContext,
} from '../../Common/Permission/index.js';
import { Log } from '../../Common/Log.js';
import type { IFlowInteractionContext, IFlowMember, FlowMemberProvider } from '../../Common/Type/FlowContext.js';

/**
 * Result of command permission resolution
 */
export interface CommandPermissionResult {
    allowed: boolean;
    reason?: string;
    tokens: PermissionToken[];
    decision?: PermissionDecision;
    requiresApproval?: boolean;
}

/**
 * Options for resolving command permissions
 */
export interface ResolveCommandPermissionOptions {
    context: IFlowInteractionContext;
    templates: Array<string | TokenSegmentInput[]>;
    additionalContext?: Record<string, unknown>;
    logSource: string;
    action?: string;
    skipApproval?: boolean;
    permissions?: PermissionsObject;
    member?: IFlowMember | null;
    memberProvider?: FlowMemberProvider;
}

/**
 * Resolve permissions for a command without Discord dependencies
 * @param options ResolveCommandPermissionOptions Configuration for resolution
 * @returns Promise of CommandPermissionResult Resolution outcome
 * @example
 * const result = await ResolveCommandPermission({
 *     context: ExtractFlowContext(interaction),
 *     templates: ['object:game:view:{guildId}'],
 *     logSource: 'ViewCommand',
 * });
 */
export async function ResolveCommandPermission(
    options: ResolveCommandPermissionOptions,
): Promise<CommandPermissionResult> {
    const {
        context,
        templates,
        additionalContext = {},
        logSource,
        action = `command`,
        permissions,
        member: providedMember,
        memberProvider,
    } = options;

    const baseContext: TokenResolveContext = {
        commandName: context.commandName,
        guildId: context.guildId,
        userId: context.userId,
        isAdministrator: context.isAdministrator,
        options: Object.fromEntries(
            context.options.map(option => {
                return [option.name, option.value];
            }),
        ),
        ...additionalContext,
    };

    Log.info(
        `${logSource}: resolving permissions for action=${action} user=${context.userId}`,
        logSource,
        `resolveCommandPermission`,
    );

    let member: IFlowMember | null = null;
    if (providedMember !== undefined) {
        member = providedMember;
    } else if (memberProvider) {
        try {
            member = await memberProvider();
        } catch(error) {
            Log.warning(
                `${logSource}: failed to fetch member via provider for action=${action} reason=${String(error)}`,
                logSource,
                `resolveCommandPermission`,
            );
        }
    }

    const outcome = await resolve(templates, {
        context: baseContext,
        member,
        permissions,
        skipApproval: options.skipApproval ?? false,
    });

    Log.info(
        `${logSource}: permission result action=${action} success=${outcome.success} reason=${outcome.detail.reason}`,
        logSource,
        `resolveCommandPermission`,
    );

    return {
        allowed: outcome.success,
        reason: outcome.detail.reason,
        tokens: outcome.detail.tokens,
        decision: outcome.detail.decision,
        requiresApproval: outcome.detail.requiresApproval,
    };
}
