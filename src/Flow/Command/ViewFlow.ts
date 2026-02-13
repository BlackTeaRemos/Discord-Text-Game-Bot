import { ResolveCommandPermission, type CommandPermissionResult } from './PermissionResolver.js';
import type { PermissionsObject } from '../../Common/Permission/index.js';
import type { IFlowInteractionContext, FlowMemberProvider } from '../../Common/Type/FlowContext.js';
import { GetGame } from '../Object/Game/View.js';
import { GetOrganizationWithMembers } from '../Object/Organization/View/index.js';
import { GetUserByUid } from '../Object/User/View.js';
import { GameObjectRepository } from '../../Repository/GameObject/GameObjectRepository.js';

/**
 * Context required for resolving view command permissions.
 * @property type string Selected object type (example: 'game').
 * @property id string Selected object identifier (example: 'game-123').
 */
export interface ViewPermissionContext {
    type: string;
    id: string;
}

export type ViewPermissionResult = CommandPermissionResult;

/**
 * Build contextual permission overrides for view operations based on the target entity and requester.
 * Uses character context when available for organization-related access checks.
 * @param context IFlowInteractionContext Extracted interaction context (example: { userId: '123', guildId: '456', ... }).
 * @param viewContext ViewPermissionContext Object type and identifier selected by the user (example: { type: 'game', id: 'game_42' }).
 * @returns Promise<PermissionsObject | undefined> Permission overrides granting access when applicable.
 * @example
 * const permissions = await buildViewPermissionOverrides(flowContext, { type: 'game', id: 'game_42' });
 */
async function __BuildViewPermissionOverrides(
    context: IFlowInteractionContext,
    viewContext: ViewPermissionContext,
): Promise<PermissionsObject | undefined> {
    const guildId = context.guildId ?? ``;
    const userId = context.userId;
    const overrides: PermissionsObject = {};

    const allow = (token: string): void => {
        overrides[token] = `allowed`;
    };

    if (context.isAdministrator) {
        allow(`view:${viewContext.type}`);
        allow(`view:${viewContext.type}:${viewContext.id}`);
        return overrides;
    }

    switch (viewContext.type) {
        case `game`: {
            const game = await GetGame(viewContext.id);
            if (!game) {
                break;
            }
            if (guildId && game.serverId === guildId) {
                allow(`view:game`);
                allow(`view:game:${viewContext.id}`);
            }
            break;
        }
        case `organization`: {
            if (context.character?.organizationUid === viewContext.id) {
                allow(`view:organization`);
                allow(`view:organization:${viewContext.id}`);
            } else {
                const organization = await GetOrganizationWithMembers(viewContext.id);
                if (!organization) {
                    break;
                }
                const isMember = organization.users.some(member => {
                    return member.discordId === userId;
                });
                if (isMember) {
                    allow(`view:organization`);
                    allow(`view:organization:${viewContext.id}`);
                }
            }
            break;
        }
        case `user`: {
            const targetUser = await GetUserByUid(viewContext.id);
            if (!targetUser) {
                break;
            }
            if (targetUser.discord_id === userId) {
                allow(`view:user`);
                allow(`view:user:${viewContext.id}`);
            }
            break;
        }
        case `building`: {
            const gameObjectRepo = new GameObjectRepository();
            const gameObject = await gameObjectRepo.GetByUid(viewContext.id);
            if (!gameObject) {
                break;
            }
            if (!gameObject.organizationUid) {
                break;
            }
            if (context.character?.organizationUid === gameObject.organizationUid) {
                allow(`view:building`);
                allow(`view:building:${viewContext.id}`);
            } else {
                const organization = await GetOrganizationWithMembers(gameObject.organizationUid);
                const belongsToOrganization = organization?.users.some(member => {
                    return member.discordId === userId;
                });
                if (belongsToOrganization) {
                    allow(`view:building`);
                    allow(`view:building:${viewContext.id}`);
                }
            }
            break;
        }
        default: {
            break;
        }
    }

    return Object.keys(overrides).length ? overrides : undefined;
}

/**
 * Options for resolving view permissions.
 * @property context IFlowInteractionContext Extracted interaction data.
 * @property viewContext ViewPermissionContext Type and ID of object to view.
 * @property memberProvider FlowMemberProvider | undefined Callback to lazily fetch member.
 */
export interface ResolveViewPermissionsOptions {
    context: IFlowInteractionContext;
    viewContext: ViewPermissionContext;
    memberProvider?: FlowMemberProvider;
}

/**
 * Resolve view command permission tokens using the standardized resolver.
 * @param options ResolveViewPermissionsOptions Configuration for resolution.
 * @returns Promise<ViewPermissionResult> Resolution outcome describing allowance and tokens.
 * @example
 * const result = await ResolveViewPermissions({
 *     context: ExtractFlowContext(interaction),
 *     viewContext: { type: 'game', id: 'g-1' },
 * });
 */
export async function ResolveViewPermissions(
    options: ResolveViewPermissionsOptions,
): Promise<ViewPermissionResult> {
    const { context, viewContext, memberProvider } = options;
    const permissions = await __BuildViewPermissionOverrides(context, viewContext);
    return ResolveCommandPermission({
        context,
        templates: [`view:{type}:{id}`],
        additionalContext: { type: viewContext.type, id: viewContext.id },
        logSource: `ViewFlow`,
        action: `view:${viewContext.type}:${viewContext.id}`,
        permissions,
        memberProvider,
    });
}
