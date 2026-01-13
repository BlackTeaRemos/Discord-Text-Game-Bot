import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { log } from '../../../Common/Log.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import { CreateUser } from '../../../Flow/Object/User/Create.js';
import { GetUserActiveGame, SetUserActiveGame } from '../../../Flow/Object/User/SelectActiveGame.js';
import { ListGamesForServer } from '../../../Flow/Object/Game/ListGamesForServer.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`create`)
    .setDescription(`Register yourself and select a game`);

export const permissionTokens = `object:user:create`;

/**
 * Start an interactive user creation session with live preview and controls.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction used to reply. @example await execute(interaction)
 * @returns Promise<void> Resolves after the preview and controls have been rendered. @example await execute(interaction)
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    try {
        const serverId = interaction.guildId;
        if (!serverId) {
            throw new Error(`This command must be used in a server.`);
        }

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        const games = await ListGamesForServer(serverId);
        const game = games[0];
        if (!game) {
            await interaction.editReply({
                content: `No games found in this server. Ask an admin to create one first.`,
                components: [],
            });
            return;
        }

        const selectedGameUid = game.uid;
        const selectedGameName = game.name;

        const existingActiveGame = await GetUserActiveGame(interaction.user.id);

        await CreateUser({
            discordId: interaction.user.id,
            name: interaction.user.username,
            friendlyName: interaction.user.username,
            imageUrl: interaction.user.displayAvatarURL?.() ?? undefined,
        });

        if (existingActiveGame?.uid === selectedGameUid) {
            await interaction.editReply({
                content: `You are already registered${existingActiveGame.name ? ` for game: ${existingActiveGame.name}` : ``}.`,
                components: [],
            });
            return;
        }

        await SetUserActiveGame(interaction.user.id, selectedGameUid);

        const switchedMessage = existingActiveGame
            ? `Active game updated from ${existingActiveGame.name} to ${selectedGameName ?? selectedGameUid}.`
            : `User registered successfully${selectedGameName ? ` for game: ${selectedGameName}` : ``}.`;

        await interaction.editReply({
            content: switchedMessage,
            components: [],
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to execute object user create`, message, `ObjectUserCreateCommand`);
        const response = {
            content: `Unable to start user creation: ${message}`,
            flags: MessageFlags.Ephemeral,
        } as const;
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: response.content, components: [] });
            } else {
                await interaction.reply(response);
            }
        } catch {
            // Silent failure if Discord refuses the message.
        }
        throw error instanceof Error ? error : new Error(message);
    }
}
