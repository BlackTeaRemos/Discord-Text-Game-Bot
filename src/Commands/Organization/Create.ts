import { MessageFlags, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { log } from '../../Common/Log.js';
import { CreateOrganization } from '../../Flow/Object/Organization/index.js';

/**
 * Handle /organization create command.
 * Creates the organization and opens description editor automatically.
 * @param interaction Discord interaction with create options.
 * @returns Promise<void> Resolves when creation completes.
 */
export async function ExecuteOrganizationCreate(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const organizationName = interaction.options.getString(`name`, true);
    const displayName = interaction.options.getString(`display_name`) ?? organizationName;
    const parentUid = interaction.options.getString(`parent`) ?? null;

    if (!organizationName.trim()) {
        await interaction.reply({
            content: `Organization name cannot be empty.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const result = await CreateOrganization({
            name: organizationName.trim(),
            friendlyName: displayName.trim(),
            parentUid: parentUid?.trim() || null,
            createdByDiscordId: interaction.user.id,
        });

        if (!result.success || !result.organization) {
            await interaction.editReply({
                content: `Failed to create organization: ${result.error ?? `Unknown error`}`,
            });
            return;
        }

        const organization = result.organization;
        const hierarchyDisplay = organization.hierarchyChain.length > 1
            ? organization.hierarchyChain.join(` → `)
            : `Root organization`;

        const embed = new EmbedBuilder()
            .setTitle(`Organization Created`)
            .setColor(0x00AE86)
            .addFields(
                { name: `UID`, value: `\`${organization.uid}\``, inline: true },
                { name: `Name`, value: organization.name, inline: true },
                { name: `Display Name`, value: organization.friendlyName, inline: true },
                { name: `Hierarchy`, value: hierarchyDisplay, inline: false },
            )
            .setTimestamp()
            .setFooter({ text: `Created by ${interaction.user.tag}` });

        if (organization.parentUid) {
            embed.addFields({ name: `Parent`, value: `\`${organization.parentUid}\``, inline: true });
        }

        await interaction.editReply({
            content: `Organization created successfully. Use \`/create description\` with the UID to add a description.`,
            embeds: [embed],
        });

        log.info(
            `Organization created: ${organization.uid}`,
            `OrganizationCreateCommand`,
            `name=${organization.name} by=${interaction.user.id}`,
        );
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to create organization`, message, `OrganizationCreateCommand`);
        await interaction.editReply({
            content: `Failed to create organization: ${message}`,
        });
    }
}
