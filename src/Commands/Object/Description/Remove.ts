import { SlashCommandSubcommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import { RunDescriptionRemoveFlow } from '../../../SubCommand/Object/Description/DescriptionRemoveFlow.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`remove`)
    .setDescription(`Remove a description by UID`)
    .addStringOption(o => {
        return o.setName(`uid`).setDescription(`Description UID`).setRequired(true);
    });

export const permissionTokens: TokenSegmentInput[][] = [[`object`, `description`, `remove`]];

export async function execute(interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>) {
    const uid = interaction.options.getString(`uid`, true);
    await RunDescriptionRemoveFlow({ interaction, descriptionUid: uid });
}
