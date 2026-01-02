import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { executeWithContext } from '../../Common/ExecutionContextHelpers.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { RunDescriptionCreateFlow } from '../../SubCommand/Object/Description/DescriptionCreateFlow.js';

export const data = new SlashCommandBuilder()
    .setName(`description`)
    .setDescription(`Work with descriptions`)
    .addSubcommand(s => {
        return s.setName(`create`).setDescription(`Create or edit description for an object`);
    });

export const permissionTokens: TokenSegmentInput[][] = [[`description`]];

/**
 * Delegate the description slash command to the shared creation flow.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction wrapper carrying execution context. @example await execute(interaction)
 * @returns Promise<void> Resolves once the creation flow finishes. @example await execute(interaction)
 */
export async function execute(interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>): Promise<void> {
    const sub = interaction.options.getSubcommand();
    if (sub !== `create`) {
        await interaction.reply({ content: `Unsupported subcommand`, flags: MessageFlags.Ephemeral });
        return;
    }

    await executeWithContext(interaction, async(flowManager, executionContext) => {
        await RunDescriptionCreateFlow({ interaction, flowManager, executionContext });
    });
}
