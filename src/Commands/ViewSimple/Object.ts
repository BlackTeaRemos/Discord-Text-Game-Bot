import { EmbedBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ResolveObjectByUid } from '../../Flow/Object/ResolveByUid.js';
import { FetchDescriptionForObject } from '../../Flow/Object/Description/FetchForObject.js';
import { log } from '../../Common/Log.js';
import {
    ResolveExecutionOrganization,
    ResolveOrganization,
} from '../../Flow/Object/Organization/index.js';
import { resolve } from '../../Common/Permission/index.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

/**
 * View description for any object by id
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when view is displayed
 */
export async function ExecuteViewObject(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const objectId = interaction.options.getString(`id`, true);
    if (!objectId.trim()) {
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.view.object.errors.emptyId`),
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
                content: TranslateFromContext(interaction.executionContext, `commands.view.object.errors.notFound`, {
                    params: { id: objectId },
                }),
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
                    action: `view`,
                },
                skipApproval: false,
            });

            if (!organizationPermission.allowed) {
                await interaction.editReply({
                    content: TranslateFromContext(interaction.executionContext, `commands.view.common.permissionDeniedOrg`, {
                        params: { organization: executionOrganization.organizationName },
                    }),
                });
                return;
            }
        } else {
            const resolution = await resolve([`user:${interaction.user.id}:view`], {
                member: await interaction.guild?.members.fetch(interaction.user.id).then(m => {
                    return m ? { id: m.id, guildId: m.guild.id, permissions: m.permissions } as any : null;
                }),
                permissions: {
                    [`user:${interaction.user.id}:view`]: `allowed`,
                },
            });
            if (!resolution.success) {
                await interaction.editReply({
                    content: TranslateFromContext(interaction.executionContext, `commands.view.common.permissionDeniedUser`),
                });
                return;
            }
        }

        const description = await FetchDescriptionForObject(objectInfo.uid, interaction.user.id);

        const typeLabel = TranslateFromContext(interaction.executionContext, `objectRegistry.types.${objectInfo.type}`, {
            defaultValue: objectInfo.type,
        });
        const title = TranslateFromContext(interaction.executionContext, `commands.view.object.labels.title`, {
            params: { type: typeLabel, name: objectInfo.name },
        });
        const idLabel = TranslateFromContext(interaction.executionContext, `commands.view.object.labels.id`);
        const typeLabelName = TranslateFromContext(interaction.executionContext, `commands.view.object.labels.type`);
        const organizationLabel = TranslateFromContext(interaction.executionContext, `commands.view.object.labels.organization`);
        const userLabel = TranslateFromContext(interaction.executionContext, `commands.view.common.user`);
        const noDescription = TranslateFromContext(interaction.executionContext, `commands.view.object.labels.noDescription`);

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(`Blue`)
            .addFields({ name: idLabel, value: `\`${objectInfo.uid}\``, inline: true })
            .addFields({ name: typeLabelName, value: typeLabel, inline: true })
            .addFields({ name: organizationLabel, value: executionOrganization.organizationName || userLabel, inline: true });

        if (description) {
            embed.setDescription(description.slice(0, 2048));
        } else {
            embed.setDescription(noDescription);
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to view object`, message, `ViewObject`);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.view.object.errors.failed`, {
                params: { message },
            }),
        });
    }
}
