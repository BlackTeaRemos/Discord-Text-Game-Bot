import { SlashCommandSubcommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { RemoveGame } from '../../../Flow/Object/Game/Remove.js';
import { log } from '../../../Common/Log.js';
import { createCommandContext } from '../../../Common/ExecutionContextHelpers.js';
import type { TokenSegmentInput } from '../../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`remove`)
    .setDescription(`Remove a game`)
    .addStringOption(o => {
        return o.setName(`uid`).setDescription(`Game UID`).setRequired(true);
    });

export const permissionTokens: TokenSegmentInput[][] = [[`object`, `game`, `remove`]];

export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
) {
    const ctx = createCommandContext(interaction);

    const uid = interaction.options.getString(`uid`, true).trim();
    try {
        const deleted = await RemoveGame(uid);
        if (!deleted) {
            return await ctx.reply({ content: `Game not found`, flags: MessageFlags.Ephemeral });
        }
        return await ctx.reply({ content: `Game ${uid} removed.`, flags: MessageFlags.Ephemeral });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Error removing game`, message, `removeGame`);
        return await ctx.reply({ content: `Error: ${message}`, flags: MessageFlags.Ephemeral });
    }
}
