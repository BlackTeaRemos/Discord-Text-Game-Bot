import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { executeWithContext } from '../../Common/ExecutionContextHelpers.js';
import { StartInteractiveDescriptionEditor } from '../../SubCommand/Editor/DescriptionEditor.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';

export const data = new SlashCommandBuilder()
    .setName(`description`)
    .setDescription(`Work with descriptions`)
    .addSubcommand(s => {
        return s.setName(`create`).setDescription(`Create or edit description for an object`);
    });

export const permissionTokens: TokenSegmentInput[][] = [[`description`]];

export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
) {
    const sub = interaction.options.getSubcommand();
    if (sub !== `create`) {
        await interaction.reply({ content: `Unsupported subcommand`, flags: MessageFlags.Ephemeral });
        return;
    }

    await executeWithContext(interaction, async (fm, executionContext) => {
        // Delegate interaction handling to the Editor subcommand which owns the UI flow.
        await StartInteractiveDescriptionEditor(fm, interaction, executionContext);
    });
}
