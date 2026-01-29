import {
    resolve,
    type PermissionDecision,
    type PermissionToken,
    type PermissionsObject,
    type TokenSegmentInput,
    type TokenResolveContext,
} from '../../Common/Permission/index.js';
import { log } from '../../Common/Log.js';
import type { IFlowInteractionContext, IFlowMember, FlowMemberProvider } from '../../Common/Type/FlowContext.js';

/**
 * Result of command permission resolution.
 * @property allowed boolean Whether the action is permitted (example: true).
 * @property reason string | undefined Explanation when denied (example: 'No matching grant').
 * @property tokens PermissionToken[] Resolved permission tokens.
 * @property decision PermissionDecision | undefined The raw decision from the resolver.
 * @property requiresApproval boolean | undefined Whether admin approval is needed.
 */
export interface CommandPermissionResult {
    allowed: boolean;
    reason?: string;
    tokens: PermissionToken[];
    decision?: PermissionDecision;
    requiresApproval?: boolean;
}

/**
 * Options for resolving command permissions.
 * @property context IFlowInteractionContext Extracted interaction data.
 * @property templates Array<string | TokenSegmentInput[]> Permission token templates.
 * @property additionalContext Record<string, unknown> | undefined Extra context values.
 * @property logSource string Logging identifier (example: 'ViewCommand').
 * @property action string | undefined Action name for logging (example: 'view').
 * @property skipApproval boolean | undefined Whether to skip approval flow.
 * @property permissions PermissionsObject | undefined Permissions config object.
 * @property member IFlowMember | null | undefined Pre-resolved member data.
 * @property memberProvider FlowMemberProvider | undefined Callback to lazily fetch member.
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
 * Resolve permissions for a command without Discord dependencies.
 * @param options ResolveCommandPermissionOptions Configuration for resolution.
 * @returns Promise<CommandPermissionResult> Resolution outcome.
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

    log.info(
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
            log.warning(
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

    log.info(
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
