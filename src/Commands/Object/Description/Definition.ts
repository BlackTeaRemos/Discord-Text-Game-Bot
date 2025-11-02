import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import {
    BuildDescriptionDefinition,
    type DescriptionDefinition,
} from '../../../Flow/Object/Description/BuildDefinition.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import type { TokenSegmentInput } from '../../../Common/Permission/index.js';

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
            .setName(`reference_type`)
            .setDescription(`Optional reference type metadata`)
            .setRequired(false)
            .addChoices(
                { name: `Organization`, value: `organization` },
                { name: `Game`, value: `game` },
                { name: `User`, value: `user` },
            );
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
    const refTypeInput = interaction.options.getString(`reference_type`);
    const refType =
        (refTypeInput === null ? undefined : (refTypeInput as DescriptionDefinition[`refType`])) ?? undefined;
    const refUid = interaction.options.getString(`reference_uid`) ?? undefined;

    const definition = BuildDescriptionDefinition({ text, refType, refUid });
    await interaction.reply({ content: buildDefinitionSummary(definition), flags: MessageFlags.Ephemeral });
}

/**
 * Format a definition object into a human-readable summary string.
 * @param definition DescriptionDefinition Definition to summarize. @example const text = buildDefinitionSummary(definition)
 * @returns string Multiline summary ready for an ephemeral reply. @example const summary = buildDefinitionSummary(definition)
 */
function buildDefinitionSummary(definition: DescriptionDefinition): string {
    const lines: string[] = [];
    lines.push(`Definition ID: ${definition.uid}`);
    lines.push(`Text: ${definition.text}`);
    if (definition.refType) {
        lines.push(`Reference Type: ${definition.refType}`);
    }
    if (definition.refUid) {
        lines.push(`Reference UID: ${definition.refUid}`);
    }
    return lines.join(`\n`);
}
