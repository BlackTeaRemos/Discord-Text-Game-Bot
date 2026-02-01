import { MessageFlags, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { log } from '../../Common/Log.js';
import {
    SetOrganizationParent,
    GetOrganizationByUid,
    CheckCircularDependency,
} from '../../Flow/Object/Organization/index.js';

/**
 * Handle /organization set_parent command.
 * Changes the parent organization with circular dependency protection.
 * @param interaction Discord interaction with set_parent options.
 * @returns Promise<void> Resolves when parent change completes.
 */
export async function ExecuteOrganizationSetParent(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const organizationUid = interaction.options.getString(`id`, true);
    const newParentUid = interaction.options.getString(`parent`) ?? null;

    if (!organizationUid.trim()) {
        await interaction.reply({
            content: `Organization UID cannot be empty.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const existingOrganization = await GetOrganizationByUid(organizationUid.trim());
        if (!existingOrganization) {
            await interaction.editReply({
                content: `Organization \`${organizationUid}\` not found.`,
            });
            return;
        }

        if (newParentUid) {
            const parentOrganization = await GetOrganizationByUid(newParentUid.trim());
            if (!parentOrganization) {
                await interaction.editReply({
                    content: `Parent organization \`${newParentUid}\` not found.`,
                });
                return;
            }

            const circularCheck = await CheckCircularDependency(newParentUid.trim(), organizationUid.trim());
            if (!circularCheck.valid) {
                const chainDisplay = circularCheck.chain
                    ? `\nDependency chain: ${circularCheck.chain.join(` → `)}`
                    : ``;

                await interaction.editReply({
                    content: `Cannot set parent: ${circularCheck.reason}${chainDisplay}`,
                });
                return;
            }
        }

        const result = await SetOrganizationParent(
            organizationUid.trim(),
            newParentUid?.trim() ?? null,
        );

        if (!result.success) {
            await interaction.editReply({
                content: `Failed to update parent: ${result.error ?? `Unknown error`}`,
            });
            return;
        }

        const updatedOrganization = await GetOrganizationByUid(organizationUid.trim());
        const hierarchyDisplay = updatedOrganization
            ? updatedOrganization.hierarchyChain.join(` → `)
            : organizationUid;

        const embed = new EmbedBuilder()
            .setTitle(`Organization Parent Updated`)
            .setColor(0x00AE86)
            .addFields(
                { name: `Organization`, value: `${existingOrganization.friendlyName} (\`${existingOrganization.uid}\`)`, inline: false },
                { name: `Previous Parent`, value: existingOrganization.parentUid ? `\`${existingOrganization.parentUid}\`` : `None (was root)`, inline: true },
                { name: `New Parent`, value: newParentUid ? `\`${newParentUid}\`` : `None (now root)`, inline: true },
                { name: `New Hierarchy`, value: hierarchyDisplay, inline: false },
            )
            .setTimestamp()
            .setFooter({ text: `Updated by ${interaction.user.tag}` });

        await interaction.editReply({
            content: `Organization parent updated successfully.`,
            embeds: [embed],
        });

        log.info(
            `Organization parent updated: ${organizationUid}`,
            `OrganizationSetParentCommand`,
            `oldParent=${existingOrganization.parentUid ?? `none`} newParent=${newParentUid ?? `none`} by=${interaction.user.id}`,
        );
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to set organization parent`, message, `OrganizationSetParentCommand`);
        await interaction.editReply({
            content: `Failed to update parent: ${message}`,
        });
    }
}
