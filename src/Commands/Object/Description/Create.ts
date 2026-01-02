import { SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { executeWithContext } from '../../../Common/ExecutionContextHelpers.js';
import type { TokenSegmentInput } from '../../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import { RunDescriptionCreateFlow } from '../../../SubCommand/Object/Description/DescriptionCreateFlow.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`create`)
    .setDescription(`Add a description to a reference object`);

export const permissionTokens: TokenSegmentInput[][] = [[`object`, `description`, `create`]];

/**
 * Execute the description creation interaction by delegating to the shared subcommand flow.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction wrapper providing execution context. @example await execute(interaction)
 * @returns Promise<void> Resolves after the flow completes. @example await execute(interaction)
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    await executeWithContext(interaction, async (manager, executionContext) => {
        await RunDescriptionCreateFlow({ interaction, flowManager: manager, executionContext });
    });
}
