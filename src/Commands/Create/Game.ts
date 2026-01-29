import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { CreateGame } from '../../Flow/Object/Game/CreateRecord.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { log } from '../../Common/Log.js';

const DEFAULT_GAME_IMAGE = `https://placehold.co/600x400?text=Game`;

/**
 * Immediately create a game with specified name for current server
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when game is created
 */
export async function ExecuteCreateGame(
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

    const gameName = interaction.options.getString(`name`, true);
    if (!gameName.trim()) {
        await interaction.reply({
            content: `Game name cannot be empty`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const existingGames = await ListGamesForServer(serverId);
        if (existingGames.length > 0) {
            await interaction.editReply({
                content: `A game already exists in this server. Only one game per server is allowed`,
            });
            return;
        }

        const game = await CreateGame(gameName.trim(), DEFAULT_GAME_IMAGE, serverId);

        await interaction.editReply({
            content: `Game **${game.name}** created successfully\nUID: \`${game.uid}\``,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to create game`, message, `CreateGame`);
        await interaction.editReply({
            content: `Failed to create game: ${message}`,
        });
    }
}
