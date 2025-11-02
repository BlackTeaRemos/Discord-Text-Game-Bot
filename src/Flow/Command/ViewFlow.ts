import type { ChatInputCommandInteraction } from 'discord.js';
import { ResolveCommandPermission, type CommandPermissionResult } from './PermissionResolver.js';
import type { PermissionsObject } from '../../Common/Permission/index.js';
import { GetGame } from '../Object/Game/View.js';
import { GetOrganizationWithMembers } from '../Object/Organization/View.js';
import { GetUserByUid } from '../Object/User/View.js';
import { GetFactory } from '../Object/Building/View.js';

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
 * @param interaction ChatInputCommandInteraction Discord interaction initiating the view (example: slash command).
 * @param context ViewPermissionContext Object type and identifier selected by the user (example: { type: 'game', id: 'game_42' }).
 * @returns Promise<PermissionsObject | undefined> Permission overrides granting access when applicable (example: { 'view:game:game_42': 'allowed' }).
 * @example
 * const permissions = await buildViewPermissionOverrides(interaction, { type: 'game', id: 'game_42' });
 */
async function buildViewPermissionOverrides(
    interaction: ChatInputCommandInteraction,
    context: ViewPermissionContext,
): Promise<PermissionsObject | undefined> {
    const guildId = interaction.guildId ?? ``;
    const userId = interaction.user.id;
    const overrides: PermissionsObject = {};

    const allow = (token: string): void => {
        overrides[token] = `allowed`;
    };

    const isAdmin = Boolean(interaction.memberPermissions?.has(`Administrator`));
    if (isAdmin) {
        allow(`view:${context.type}`);
        allow(`view:${context.type}:${context.id}`);
        return overrides;
    }

    switch (context.type) {
        case `game`: {
            const game = await GetGame(context.id);
            if (!game) {
                break;
            }
            if (guildId && game.serverId === guildId) {
                allow(`view:game`);
                allow(`view:game:${context.id}`);
            }
            break;
        }
        case `organization`: {
            const organization = await GetOrganizationWithMembers(context.id);
            if (!organization) {
                break;
            }
            const isMember = organization.users.some(member => {
                return member.discord_id === userId;
            });
            if (isMember) {
                allow(`view:organization`);
                allow(`view:organization:${context.id}`);
            }
            break;
        }
        case `user`: {
            const targetUser = await GetUserByUid(context.id);
            if (!targetUser) {
                break;
            }
            if (targetUser.discord_id === userId) {
                allow(`view:user`);
                allow(`view:user:${context.id}`);
            }
            break;
        }
        case `building`: {
            const factory = await GetFactory(context.id);
            if (!factory) {
                break;
            }
            if (!factory.organizationUid) {
                break;
            }
            const organization = await GetOrganizationWithMembers(factory.organizationUid);
            const belongsToOrganization = organization?.users.some(member => {
                return member.discord_id === userId;
            });
            if (belongsToOrganization) {
                allow(`view:building`);
                allow(`view:building:${context.id}`);
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
 * Resolve view command permission tokens using the standardized resolver.
 * @param interaction ChatInputCommandInteraction Interaction requesting the permission (example: original slash interaction).
 * @param context ViewPermissionContext Context values applied to templates (example: { type: 'game', id: 'g-1' }).
 * @returns Promise<ViewPermissionResult> Resolution outcome describing allowance and tokens.
 * @example
 * const result = await resolveViewPermissions(interaction, { type: 'game', id: 'g-1' });
 */
export async function ResolveViewPermissions(
    interaction: ChatInputCommandInteraction,
    context: ViewPermissionContext,
): Promise<ViewPermissionResult> {
    const permissions = await buildViewPermissionOverrides(interaction, context);
    return ResolveCommandPermission({
        interaction,
        templates: [`view:{type}:{id}`],
        context: { type: context.type, id: context.id },
        logSource: `ViewFlow`,
        action: `view:${context.type}:${context.id}`,
        permissions,
    });
}
