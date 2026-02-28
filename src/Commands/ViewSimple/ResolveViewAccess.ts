import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import {
    ResolveExecutionOrganization,
    ResolveOrganization,
} from '../../Flow/Object/Organization/index.js';
import { resolve } from '../../Common/Permission/index.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

/**
 * @brief Resolved permission context after organization and user checks pass
 */
export interface ViewPermissionContext {
    organizationUid: string | null; // resolved organization UID or null for user scope
    organizationName: string; // display name of resolved organization
    scopeType: string; // scope type of the execution context
}

/**
 * @brief Options for resolving view permission
 */
export interface ResolveViewAccessOptions {
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>; // triggering interaction
    action: string; // permission action token suffix
    requestedOrganizationUid: string | null; // optional user provided organization override
}

/**
 * @brief Resolve organization context and check view permission
 * @param options ResolveViewAccessOptions Configuration for access resolution
 * @returns ViewPermissionContext or null Resolved context or null if denied
 * @example
 * const access = await ResolveViewAccess({ interaction, action: 'view', requestedOrganizationUid: null });
 * if (!access) return;
 */
export async function ResolveViewAccess(
    options: ResolveViewAccessOptions,
): Promise<ViewPermissionContext | null> {
    const { interaction, action, requestedOrganizationUid } = options;

    const executionOrganization = await ResolveExecutionOrganization(
        interaction.user.id,
        requestedOrganizationUid,
    );

    if (executionOrganization.scopeType === `organization` && executionOrganization.organizationUid) {
        const organizationPermission = await ResolveOrganization({
            context: {
                organizationUid: executionOrganization.organizationUid,
                userId: interaction.user.id,
                action,
            },
            skipApproval: false,
        });

        if (!organizationPermission.allowed) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.view.common.permissionDeniedOrg`, {
                    params: { organization: executionOrganization.organizationName },
                }),
            });
            return null;
        }
    } else {
        const resolution = await resolve([`user:${interaction.user.id}:${action}`], {
            member: await interaction.guild?.members.fetch(interaction.user.id).then(member => {
                return member ? { id: member.id, guildId: member.guild.id, permissions: member.permissions } as any : null;
            }),
            permissions: {
                [`user:${interaction.user.id}:${action}`]: `allowed`,
            },
        });

        if (!resolution.success) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.view.common.permissionDeniedUser`),
            });
            return null;
        }
    }

    return {
        organizationUid: executionOrganization.organizationUid,
        organizationName: executionOrganization.organizationName,
        scopeType: executionOrganization.scopeType,
    };
}
