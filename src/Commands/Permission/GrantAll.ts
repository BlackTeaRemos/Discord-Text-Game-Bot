import { MessageFlags, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { GrantAllTokens } from '../../Flow/Permission/GrantAllTokens.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

/**
 * Executes the permit all subcommand granting every known token to the target user
 *
 * @param interaction InteractionExecutionContextCarrier Discord interaction
 * @returns void Resolves when reply is sent
 *
 * @example
 * await ExecuteGrantAll(interaction);
 */
export async function ExecuteGrantAll(
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

        const result = await GrantAllTokens(guildId, targetUser.id, interaction.user.id);

        const tokenList = result.tokens.map((discovered) => {
            return `\`${discovered.serialized}\` _(${discovered.commandName})_`;
        }).join(`\n`);

        const embed = new EmbedBuilder()
            .setTitle(TranslateFromContext(interaction.executionContext, `commands.permit.grantAll.title`))
            .setDescription(
                TranslateFromContext(interaction.executionContext, `commands.permit.grantAll.description`, {
                    params: {
                        user: targetUser.toString(),
                        count: String(result.grantedCount),
                        total: String(result.totalTokens),
                    },
                }),
            )
            .addFields({ name: TranslateFromContext(interaction.executionContext, `commands.permit.grantAll.tokensField`), value: tokenList || `-` })
            .setColor(0x22c55e)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (interaction.deferred) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.permit.errors.grantFailed`, {
                    params: { reason: errorMessage },
                }),
            });
        } else {
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.permit.errors.grantFailed`, {
                    params: { reason: errorMessage },
                }),
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}
