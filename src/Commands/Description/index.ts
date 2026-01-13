import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';

/**
 * @deprecated Use /create description <id> instead
 * This command is kept for backward compatibility and will be removed
 */
export const data = new SlashCommandBuilder()
    .setName(`description`)
    .setDescription(`[DEPRECATED] Use /create description <id>`);

export const permissionTokens: TokenSegmentInput[][] = [[`description`]];

export async function execute(interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>): Promise<void> {
    await interaction.reply({
        content: `This command is deprecated\n\nUse \`/create description <object id>\` instead`,
        flags: MessageFlags.Ephemeral,
    });
}
