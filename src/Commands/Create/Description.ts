import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import type { PermissionsObject, PermissionState } from '../../Common/Permission/types.js';
import { RunDescriptionEditorFlow } from '../../Flow/Object/Description/Editor/index.js';
import { log } from '../../Common/Log.js';
import { ResolveObjectByUid } from '../../Flow/Object/ResolveByUid.js';
import {
    ResolveExecutionOrganization,
    ResolveOrganization,
} from '../../Flow/Object/Organization/index.js';
import { resolve } from '../../Common/Permission/index.js';

/**
 * Open description editor for any object by id
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when editor flow completes
 */
export async function ExecuteCreateDescription(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const objectId = interaction.options.getString(`id`, true);
    if (!objectId.trim()) {
        await interaction.reply({
            content: `Object ID cannot be empty`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const objectInfo = await ResolveObjectByUid(objectId.trim());
        if (!objectInfo) {
            await interaction.editReply({
                content: `Object with ID \`${objectId}\` not found`,
            });
            return;
        }

        if (objectInfo.type === `description`) {
            await interaction.editReply({
                content: `Descriptions cannot target other descriptions.`,
            });
            return;
        }

        const requestedOrganizationUid = interaction.options.getString(`organization`)?.trim() || null; // optional org override
        const executionOrganization = await ResolveExecutionOrganization(
            interaction.user.id,
            requestedOrganizationUid,
        ); // resolved execution scope

        if (executionOrganization.scopeType === `organization` && executionOrganization.organizationUid) {
            const organizationPermission = await ResolveOrganization({
                context: {
                    organizationUid: executionOrganization.organizationUid,
                    userId: interaction.user.id,
                    action: `create_description`,
                },
                skipApproval: false,
            });

            if (!organizationPermission.allowed) {
                await interaction.editReply({
                    content: `Permission denied (${executionOrganization.organizationName}).`,
                });
                return;
            }
        } else {
            const resolution = await resolve([`user:${interaction.user.id}:create_description`], {
                member: await interaction.guild?.members.fetch(interaction.user.id).then(m => {
                    return m ? { id: m.id, guildId: m.guild.id, permissions: m.permissions } as any : null;
                }),
                permissions: {
                    [`user:${interaction.user.id}:create_description`]: `allowed`,
                },
            });
            if (!resolution.success) {
                await interaction.editReply({
                    content: `Permission denied (User).`,
                });
                return;
            }
        }

        const canEditGlobal = interaction.memberPermissions?.has(`Administrator`) ?? false;
        const permissions = __BuildEditorPermissions(canEditGlobal);

        await interaction.editReply({
            content: `Opening description editor for **${objectInfo.type}** \`${objectInfo.uid}\` as ${executionOrganization.organizationName}...`,
        });

        await RunDescriptionEditorFlow(interaction as unknown as ChatInputCommandInteraction, {
            objectType: objectInfo.type,
            objectUid: objectInfo.uid,
            userUid: interaction.user.id,
            organizationUid: executionOrganization.organizationUid,
            canEditGlobal,
            permissions,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to open description editor`, message, `CreateDescription`);
        await interaction.editReply({
            content: `Failed to open description editor: ${message}`,
        });
    }
}

/**
 * Build permission map for description editor scopes
 * @param canEditGlobal boolean Whether global scope editing is allowed
 * @returns PermissionsObject Permission map
 */
function __BuildEditorPermissions(canEditGlobal: boolean): PermissionsObject {
    const permissions: PermissionsObject = {
        [`description:scope:user:view`]: `allowed` as PermissionState,
        [`description:scope:user:edit`]: `allowed` as PermissionState,
        [`description:scope:organization:view`]: `allowed` as PermissionState,
        [`description:scope:organization:edit`]: `allowed` as PermissionState,
    };

    if (canEditGlobal) {
        permissions[`description:scope:global:view`] = `allowed` as PermissionState;
        permissions[`description:scope:global:edit`] = `allowed` as PermissionState;
    }

    return permissions;
}
