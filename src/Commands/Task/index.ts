import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import { executeWithContext } from '../../Common/ExecutionContextHelpers.js';
import { startTaskFlow } from './StartTaskFlow.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';

export const data = new SlashCommandBuilder().setName(`task`).setDescription(`Manage organization tasks`);

export const permissionTokens: TokenSegmentInput[][] = [[`task`]];

export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    await executeWithContext(interaction, async (flowManager, executionContext) => {
        await startTaskFlow(flowManager, interaction, executionContext);
    });
}
