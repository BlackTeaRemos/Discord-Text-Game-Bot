import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../Common/Type/Interaction.js';
import { ExecuteViewTask } from './ViewSimple/Task.js';
import { Translate } from '../Services/I18nService.js';

export const data = new SlashCommandBuilder()
    .setName(`tasks`)
    .setDescription(Translate(`commands.tasks.description`))
    .addStringOption(option => {
        return option
            .setName(`id`)
            .setDescription(Translate(`commands.tasks.options.id`))
            .setRequired(false);
    })
    .addIntegerOption(option => {
        return option
            .setName(`turn`)
            .setDescription(Translate(`commands.tasks.options.turn`))
            .setRequired(false);
    })
    .addStringOption(option => {
        return option
            .setName(`status`)
            .setDescription(Translate(`commands.tasks.options.status`))
            .addChoices(
                { name: Translate(`commands.tasks.status.todo`), value: `todo` },
                { name: Translate(`commands.tasks.status.completed`), value: `completed` },
                { name: Translate(`commands.tasks.status.failed`), value: `failed` },
                { name: Translate(`commands.tasks.status.all`), value: `all` },
            )
            .setRequired(false);
    })
    .addUserOption(option => {
        return option
            .setName(`creator`)
            .setDescription(Translate(`commands.tasks.options.creator`))
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
