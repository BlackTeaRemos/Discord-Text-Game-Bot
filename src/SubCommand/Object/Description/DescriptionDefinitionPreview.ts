import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import type { DescriptionDefinition } from '../../../Flow/Object/Description/BuildDefinition.js';

/**
 * Build a human readable summary describing a description definition.
 * @param definition DescriptionDefinition Definition to summarize. @example const summary = BuildDescriptionDefinitionSummary(definition)
 * @returns string Multiline summary string suitable for an ephemeral reply. @example const text = BuildDescriptionDefinitionSummary(definition)
 */
export function BuildDescriptionDefinitionSummary(definition: DescriptionDefinition): string {
    const lines: string[] = [];
    lines.push(`Definition metadata stored internally.`);
    lines.push(`Text: ${definition.text}`);
    if (definition.refUid) {
        lines.push(`Reference UID: ${definition.refUid}`);
    }
    return lines.join(`\n`);
}

export interface SendDescriptionDefinitionPreviewOptions {
    /**
     * Discord interaction used to deliver the preview message.
     */
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    /**
     * Definition payload being summarized in the reply.
     */
    definition: DescriptionDefinition;
}

/**
 * Send an ephemeral preview describing the supplied definition payload.
 * @param options SendDescriptionDefinitionPreviewOptions Message configuration. @example await SendDescriptionDefinitionPreview({ interaction, definition })
 * @returns Promise<void> Resolves after the reply is sent. @example await SendDescriptionDefinitionPreview({ interaction, definition })
 */
export async function SendDescriptionDefinitionPreview(
    options: SendDescriptionDefinitionPreviewOptions,
): Promise<void> {
    const { interaction, definition } = options;
    const content = BuildDescriptionDefinitionSummary(definition);
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}
