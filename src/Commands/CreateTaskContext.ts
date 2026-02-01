import { ApplicationCommandType, ContextMenuCommandBuilder } from 'discord.js';
import type { MessageContextMenuCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../Common/Type/Interaction.js';
import { ExecuteCreateTaskFromMessageContext } from './Create/Task.js';

export const data = new ContextMenuCommandBuilder()
    .setName(`Create task`)
    .setType(ApplicationCommandType.Message);

export const permissionTokens: TokenSegmentInput[][] = [[`create`]];

/**
 * Create a task from a selected message via context menu
 * @param interaction InteractionExecutionContextCarrier<MessageContextMenuCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when the task is created
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<MessageContextMenuCommandInteraction>,
): Promise<void> {
    await ExecuteCreateTaskFromMessageContext(interaction);
}
