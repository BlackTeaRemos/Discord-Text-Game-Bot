import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ExecuteManageGame } from './Game.js';

export const data = new SlashCommandBuilder()
    .setName(`manage`)
    .setDescription(`Manage game entities`)
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`game`)
            .setDescription(`Manage game settings and turn`);
    });

export const permissionTokens: TokenSegmentInput[][] = [[`manage`]];

/**
 * Route /manage subcommands to respective handlers
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when handler completes
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case `game`:
            await ExecuteManageGame(interaction);
            break;
        default:
            await interaction.reply({
                content: `Unknown subcommand: ${subcommand}`,
                flags: MessageFlags.Ephemeral,
            });
    }
}
