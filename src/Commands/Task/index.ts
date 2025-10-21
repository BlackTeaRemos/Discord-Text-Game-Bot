import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/permission/index.js';
import { executeWithContext } from '../../Common/ExecutionContextHelpers.js';
import { startTaskFlow } from './startTaskFlow.js';

export const data = new SlashCommandBuilder().setName(`task`).setDescription(`Manage organization tasks`);

export const permissionTokens: TokenSegmentInput[][] = [[`task`]];

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await executeWithContext(interaction, async (flowManager, executionContext) => {
        await startTaskFlow(flowManager, interaction, executionContext);
    });
}
