import { MessageFlags, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ListUserGrants } from '../../Flow/permission/ListUserGrants.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

/**
 * Execute the /permit list subcommand.
 * Shows all permanent permission grants held by the target user.
 *
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction.
 * @returns Promise<void> Resolves when reply is sent.
 *
 * @example
 * await ExecuteListGrants(interaction);
 */
export async function ExecuteListGrants(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const targetUser = interaction.options.getUser(`user`, true);
    const guildId = interaction.guildId;

    if (!guildId) {
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.permit.errors.guildOnly`),
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    try {
        const result = ListUserGrants(guildId, targetUser.id);

        if (result.grants.length === 0) {
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.permit.list.noGrants`, {
                    params: { user: targetUser.toString() },
                }),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const grantLines = result.grants.map((grant) => {
            return `\`${grant.formatted}\``;
        }).join(`\n`);

        const embed = new EmbedBuilder()
            .setTitle(TranslateFromContext(interaction.executionContext, `commands.permit.list.title`))
            .setDescription(
                TranslateFromContext(interaction.executionContext, `commands.permit.list.description`, {
                    params: {
                        user: targetUser.toString(),
                        count: String(result.grants.length),
                    },
                }),
            )
            .addFields({ name: TranslateFromContext(interaction.executionContext, `commands.permit.list.grantsField`), value: grantLines })
            .setColor(0x3b82f6)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.permit.errors.listFailed`, {
                params: { reason: errorMessage },
            }),
            flags: MessageFlags.Ephemeral,
        });
    }
}
