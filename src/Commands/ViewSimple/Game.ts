import { EmbedBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { GetGame } from '../../Flow/Object/Game/View.js';
import { GetGameCurrentTurn } from '../../Flow/Object/Game/Turn.js';
import { FetchDescriptionForObject } from '../../Flow/Object/Description/FetchForObject.js';
import { log } from '../../Common/Log.js';

/**
 * View game description immediately
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when view is displayed
 */
export async function ExecuteViewGame(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const serverId = interaction.guildId;
    if (!serverId) {
        await interaction.reply({
            content: `This command must be used in a server`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const games = await ListGamesForServer(serverId);
        const game = games[0];
        if (!game) {
            await interaction.editReply({
                content: `No game exists in this server. Create one first with \`/create game\``,
            });
            return;
        }

        const gameData = await GetGame(game.uid);
        if (!gameData) {
            await interaction.editReply({
                content: `Game data could not be loaded`,
            });
            return;
        }

        const currentTurn = await GetGameCurrentTurn(game.uid);
        const description = await FetchDescriptionForObject(game.uid, interaction.user.id);

        const embed = new EmbedBuilder()
            .setTitle(gameData.name)
            .setColor(`Blue`)
            .addFields({ name: `Current Turn`, value: String(currentTurn), inline: true });

        if (gameData.image) {
            embed.setThumbnail(gameData.image);
        }

        if (description) {
            embed.setDescription(description.slice(0, 2048));
        } else {
            embed.setDescription(`No description available`);
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to view game`, message, `ViewGame`);
        await interaction.editReply({
            content: `Failed to view game: ${message}`,
        });
    }
}
