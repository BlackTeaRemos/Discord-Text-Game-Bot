import { ResolveCommandPermission, type CommandPermissionResult } from './PermissionResolver.js';
import type { IFlowInteractionContext, FlowMemberProvider } from '../../Common/Type/FlowContext.js';

/**
 * Context used when resolving game creation permissions.
 * @property serverId string Identifier of the guild where game is created (example: '123').
 */
export interface GameCreatePermissionContext {
    serverId: string;
}

/**
 * Result of game creation permission resolution.
 * Extends base result with approval requirement status.
 */
export interface GameCreatePermissionResult extends CommandPermissionResult {
    needsAdminApproval: boolean;
}

/**
 * Options for resolving game creation permissions.
 * @property context IFlowInteractionContext Extracted interaction data.
 * @property gameContext GameCreatePermissionContext Server context for creation.
 * @property memberProvider FlowMemberProvider | undefined Callback to lazily fetch member.
 */
export interface ResolveGameCreatePermissionsOptions {
    context: IFlowInteractionContext;
    gameContext: GameCreatePermissionContext;
    memberProvider?: FlowMemberProvider;
}

/**
 * Resolve permissions for game creation without performing UI actions.
 * Command layer handles user responses and admin approval UI when needsAdminApproval is true.
 * @param options ResolveGameCreatePermissionsOptions Configuration for resolution.
 * @returns Promise<GameCreatePermissionResult> Outcome indicating whether access is granted or approval needed.
 * @example
 * const outcome = await ResolveGameCreatePermissions({
 *     context: ExtractFlowContext(interaction),
 *     gameContext: { serverId: guildId },
 * });
 * if (!outcome.allowed && outcome.needsAdminApproval) {
 *     // Command layer handles admin approval UI
 * }
 */
export async function ResolveGameCreatePermissions(
    options: ResolveGameCreatePermissionsOptions,
): Promise<GameCreatePermissionResult> {
    const { context, gameContext, memberProvider } = options;

    const outcome = await ResolveCommandPermission({
        context,
        templates: [`object:game:create:{serverId}`, `object:game:create`],
        additionalContext: { serverId: gameContext.serverId },
        logSource: `GameCreateFlow`,
        action: `object:game:create:${gameContext.serverId}`,
        memberProvider,
    });

    return {
        ...outcome,
        needsAdminApproval: !outcome.allowed && Boolean(outcome.requiresApproval),
    };
}
