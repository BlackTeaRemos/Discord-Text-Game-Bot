import { MessageFlags, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { Log } from '../../Common/Log.js';
import { CreateOrganization } from '../../Flow/Object/Organization/index.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

/**
 * Handle organization create command
 * @param interaction Discord interaction with create options
 * @returns void
 */
export async function ExecuteOrganizationCreate(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const organizationName = interaction.options.getString(`name`, true);
    const displayName = interaction.options.getString(`display_name`) ?? organizationName;
    const parentUid = interaction.options.getString(`parent`) ?? null;

    if (!organizationName.trim()) {
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.create.errors.emptyName`),
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
            const reason = result.error
                ?? TranslateFromContext(interaction.executionContext, `commands.organization.create.errors.unknownError`);
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.create.errors.failed`, {
                    params: { reason },
                }),
            });
            return;
        }

        const organization = result.organization;
        const hierarchyDisplay = organization.hierarchyChain.length > 1
            ? organization.hierarchyChain.join(` → `)
            : TranslateFromContext(interaction.executionContext, `commands.organization.create.labels.rootOrganization`);

        const title = TranslateFromContext(interaction.executionContext, `commands.organization.create.labels.title`);
        const uidLabel = TranslateFromContext(interaction.executionContext, `commands.organization.create.labels.uid`);
        const nameLabel = TranslateFromContext(interaction.executionContext, `commands.organization.create.labels.name`);
        const displayNameLabel = TranslateFromContext(interaction.executionContext, `commands.organization.create.labels.displayName`);
        const hierarchyLabel = TranslateFromContext(interaction.executionContext, `commands.organization.create.labels.hierarchy`);
        const parentLabel = TranslateFromContext(interaction.executionContext, `commands.organization.create.labels.parent`);
        const createdByLabel = TranslateFromContext(interaction.executionContext, `commands.organization.create.labels.createdBy`, {
            params: { userTag: interaction.user.tag },
        });

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(0x00AE86)
            .addFields(
                { name: uidLabel, value: `\`${organization.uid}\``, inline: true },
                { name: nameLabel, value: organization.name, inline: true },
                { name: displayNameLabel, value: organization.friendlyName, inline: true },
                { name: hierarchyLabel, value: hierarchyDisplay, inline: false },
            )
            .setTimestamp()
            .setFooter({ text: createdByLabel });

        if (organization.parentUid) {
            embed.addFields({ name: parentLabel, value: `\`${organization.parentUid}\``, inline: true });
        }

        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.create.messages.success`),
            embeds: [embed],
        });

        Log.info(
            `Organization created: ${organization.uid}`,
            `OrganizationCreateCommand`,
            `name=${organization.name} by=${interaction.user.id}`,
        );
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Failed to create organization`, message, `OrganizationCreateCommand`);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.create.errors.failed`, {
                params: { reason: message },
            }),
        });
    }
}
