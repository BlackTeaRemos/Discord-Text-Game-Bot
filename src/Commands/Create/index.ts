import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ExecuteCreateGame } from './Game.js';
import { ExecuteCreateTask } from './Task.js';
import { ExecuteCreateDescription } from './Description.js';

export const data = new SlashCommandBuilder()
    .setName(`create`)
    .setDescription(`Create game entities`)
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`game`)
            .setDescription(`Create a new game for this server`)
            .addStringOption(option => {
                return option
                    .setName(`name`)
                    .setDescription(`Name for the game`)
                    .setRequired(true);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`task`)
            .setDescription(`Create task from replied message for current turn`)
            .addIntegerOption(option => {
                return option
                    .setName(`delay`)
                    .setDescription(`Turn delay offset; can be negative`)
                    .setRequired(false);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`description`)
            .setDescription(`Edit description for an object`)
            .addStringOption(option => {
                return option
                    .setName(`id`)
                    .setDescription(`Object identifier to edit description for`)
                    .setRequired(true);
            });
    });

export const permissionTokens: TokenSegmentInput[][] = [[`create`]];

/**
 * Route /create subcommands to respective handlers
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when handler completes
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case `game`:
            await ExecuteCreateGame(interaction);
            break;
        case `task`:
            await ExecuteCreateTask(interaction);
            break;
        case `description`:
            await ExecuteCreateDescription(interaction);
            break;
        default:
            await interaction.reply({
                content: `Unknown subcommand: ${subcommand}`,
                flags: MessageFlags.Ephemeral,
            });
    }
}
