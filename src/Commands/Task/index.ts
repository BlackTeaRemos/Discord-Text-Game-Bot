import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';

/**
 * @deprecated Use /create task and /view task instead
 * This command is kept for backward compatibility and will be removed
 */
export const data = new SlashCommandBuilder()
    .setName(`task`)
    .setDescription(`[DEPRECATED] Use /create task and /view task`);

export const permissionTokens: TokenSegmentInput[][] = [[`task`]];

export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    await interaction.reply({
        content: `This command is deprecated\n\nUse these commands instead:\n\`/create task\` - Create task from replied message\n\`/view task\` - List tasks for current turn`,
        flags: MessageFlags.Ephemeral,
    });
}
