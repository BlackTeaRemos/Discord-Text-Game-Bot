import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import { RemoveScopedDescriptionByUid } from '../../../Flow/Object/Description/Scope/RemoveScopedDescriptionByUid.js';
import { log } from '../../../Common/Log.js';

export interface DescriptionRemoveFlowOptions {
    /**
     * Discord interaction used to communicate the outcome.
     */
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    /**
     * UID of the description targeted for removal.
     */
    descriptionUid: string;
}

/**
 * Remove a description node and report the outcome back to the user.
 * @param options DescriptionRemoveFlowOptions Flow configuration. @example await RunDescriptionRemoveFlow({ interaction, descriptionUid: 'desc_123' })
 * @returns Promise<void> Resolves once the user has been notified. @example await RunDescriptionRemoveFlow({ interaction, descriptionUid: 'desc_123' })
 */
export async function RunDescriptionRemoveFlow(options: DescriptionRemoveFlowOptions): Promise<void> {
    const { interaction, descriptionUid } = options;
    const trimmed = descriptionUid.trim();

    try {
        if (!trimmed.startsWith(`sdesc_`)) {
            await interaction.reply({
                content: `Only scoped descriptions (uid starting with 'sdesc_') can be removed.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const removed = await RemoveScopedDescriptionByUid(trimmed);
        if (!removed) {
            await interaction.reply({ content: `Description not found`, flags: MessageFlags.Ephemeral });
            return;
        }
        await interaction.reply({ content: `Description removed.`, flags: MessageFlags.Ephemeral });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Error removing description`, message, `DescriptionRemoveFlow`);
        await interaction.reply({ content: `Error: ${message}`, flags: MessageFlags.Ephemeral });
    }
}
