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
                    content: `Permission denied (${executionOrganization.organizationName}).`,
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
                    content: `Permission denied (User).`,
                });
                return;
            }
        }

        const description = await FetchDescriptionForObject(objectInfo.uid, interaction.user.id);

        const embed = new EmbedBuilder()
            .setTitle(`${objectInfo.type.charAt(0).toUpperCase()}${objectInfo.type.slice(1)}: ${objectInfo.name}`)
            .setColor(`Blue`)
            .addFields({ name: `ID`, value: `\`${objectInfo.uid}\``, inline: true })
            .addFields({ name: `Type`, value: objectInfo.type, inline: true })
            .addFields({ name: `Org`, value: executionOrganization.organizationName || `User`, inline: true });

        if (description) {
            embed.setDescription(description.slice(0, 2048));
        } else {
            embed.setDescription(`No description available`);
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to view object`, message, `ViewObject`);
        await interaction.editReply({
            content: `Failed to view object: ${message}`,
        });
    }
}
