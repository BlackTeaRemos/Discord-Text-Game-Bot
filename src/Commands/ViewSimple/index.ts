import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ExecuteViewGame } from './Game.js';
import { ExecuteViewTask } from './Task.js';
import { ExecuteViewObject } from './Object.js';

export const data = new SlashCommandBuilder()
    .setName(`view`)
    .setDescription(`View game entities and descriptions`)
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`game`)
            .setDescription(`View game description`);
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`task`)
            .setDescription(`List tasks for current turn`)
            .addIntegerOption(option => {
                return option
                    .setName(`turn`)
                    .setDescription(`View tasks for specific turn`)
                    .setRequired(false);
            })
            .addUserOption(option => {
                return option
                    .setName(`creator`)
                    .setDescription(`Filter by task creator`)
                    .setRequired(false);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`object`)
            .setDescription(`View description for any object`)
            .addStringOption(option => {
                return option
                    .setName(`id`)
                    .setDescription(`Object identifier to view`)
                    .setRequired(true);
            });
    });

export const permissionTokens: TokenSegmentInput[][] = [[`view`]];

/**
 * Route /view subcommands to respective handlers
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when handler completes
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case `game`:
            await ExecuteViewGame(interaction);
            break;
        case `task`:
            await ExecuteViewTask(interaction);
            break;
        case `object`:
            await ExecuteViewObject(interaction);
            break;
        default:
            await interaction.reply({
                content: `Unknown subcommand: ${subcommand}`,
                flags: MessageFlags.Ephemeral,
            });
    }
}
