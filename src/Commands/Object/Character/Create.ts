import { SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import { executeWithContext } from '../../../Common/ExecutionContextHelpers.js';
import type { TokenSegmentInput } from '../../../Common/Permission/index.js';
import { RunCharacterCreateFlow } from './RunCreateFlow.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`create`)
    .setDescription(`Create a character and set it as your active character`);

export const permissionTokens: TokenSegmentInput[][] = [[`object`, `character`, `create`]];

/**
 * Create a character and set it as active for the caller.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction. @example await execute(interaction)
 * @returns Promise<void>
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    await executeWithContext(interaction, async(flowManager) => {
        await RunCharacterCreateFlow({ flowManager, interaction });
    });
}
