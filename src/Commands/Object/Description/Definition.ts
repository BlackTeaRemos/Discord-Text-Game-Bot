import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { BuildDescriptionDefinition } from '../../../Flow/Object/Description/BuildDefinition.js';
import type { DescriptionDefinition } from '../../../Flow/Object/Description/BuildDefinition.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import type { TokenSegmentInput } from '../../../Common/Permission/index.js';
import { BuildDescriptionDefinitionSummary } from '../../../SubCommand/Object/Description/DescriptionDefinitionPreview.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`definition`)
    .setDescription(`Generate a description definition without storing it`)
    .addStringOption(option => {
        return option
            .setName(`text`)
            .setDescription(`Optional description text to normalize`)
            .setRequired(false)
            .setMaxLength(1024);
    })
    .addStringOption(option => {
        return option
            .setName(`reference_uid`)
            .setDescription(`Optional reference UID metadata`)
            .setRequired(false)
            .setMaxLength(64);
    });

export const permissionTokens: TokenSegmentInput[][] = [[`object`, `description`, `definition`]];

/**
 * Generate and present a description definition without persisting it to storage.
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction wrapper providing execution context. @example await execute(interaction)
 * @returns Promise<void> Resolves after the definition preview message is sent. @example await execute(interaction)
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const text = interaction.options.getString(`text`) ?? undefined;
    const refUid = interaction.options.getString(`reference_uid`) ?? undefined;

    const definition = BuildDescriptionDefinition({ text, refUid });
    const summary = BuildDescriptionDefinitionSummary(definition);
    await interaction.reply({ content: summary, flags: MessageFlags.Ephemeral });
}
