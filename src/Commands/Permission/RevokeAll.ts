import { MessageFlags, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { RevokeAllTokens } from '../../Flow/Permission/RevokeAllTokens.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

/**
 * @brief Execute the permit revoke subcommand
 * @param interaction InteractionExecutionContextCarrier Discord interaction
 * @returns void Resolves when reply is sent
 * @example
 * await ExecuteRevokeAll(interaction);
 */
export async function ExecuteRevokeAll(
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
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const result = await RevokeAllTokens(guildId, targetUser.id, interaction.user.id);

        const embed = new EmbedBuilder()
            .setTitle(TranslateFromContext(interaction.executionContext, `commands.permit.revoke.title`))
            .setDescription(
                TranslateFromContext(interaction.executionContext, `commands.permit.revoke.description`, {
                    params: {
                        user: targetUser.toString(),
                        count: String(result.revokedCount),
                    },
                }),
            )
            .setColor(0xef4444)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (interaction.deferred) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.permit.errors.revokeFailed`, {
                    params: { reason: errorMessage },
                }),
            });
        } else {
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.permit.errors.revokeFailed`, {
                    params: { reason: errorMessage },
                }),
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}
