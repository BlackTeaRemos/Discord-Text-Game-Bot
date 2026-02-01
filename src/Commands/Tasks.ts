import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../Common/Type/Interaction.js';
import { ExecuteViewTask } from './ViewSimple/Task.js';

export const data = new SlashCommandBuilder()
    .setName(`tasks`)
    .setDescription(`List tasks or view a task`)
    .addStringOption(option => {
        return option
            .setName(`id`)
            .setDescription(`Task id to view`)
            .setRequired(false);
    })
    .addIntegerOption(option => {
        return option
            .setName(`turn`)
            .setDescription(`View tasks for specific turn`)
            .setRequired(false);
    })
    .addStringOption(option => {
        return option
            .setName(`status`)
            .setDescription(`Filter by status group`)
            .addChoices(
                { name: `todo`, value: `todo` },
                { name: `completed`, value: `completed` },
                { name: `failed`, value: `failed` },
                { name: `all`, value: `all` },
            )
            .setRequired(false);
    })
    .addUserOption(option => {
        return option
            .setName(`creator`)
            .setDescription(`Filter by task creator`)
            .setRequired(false);
    });

export const permissionTokens: TokenSegmentInput[][] = [[`view`]];

/**
 * Route /tasks to task view handler
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when handler completes
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    await ExecuteViewTask(interaction);
}
