import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import { RemoveScopedDescriptionByUid } from '../../../Flow/Object/Description/Scope/RemoveScopedDescriptionByUid.js';
import { log } from '../../../Common/Log.js';
import { TranslateFromContext } from '../../../Services/I18nService.js';

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
                content: TranslateFromContext(interaction.executionContext, `descriptionRemove.invalidScopedUid`),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const removed = await RemoveScopedDescriptionByUid(trimmed);
        if (!removed) {
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `descriptionRemove.notFound`),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `descriptionRemove.removed`),
            flags: MessageFlags.Ephemeral,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Error removing description`, message, `DescriptionRemoveFlow`);
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `descriptionRemove.error`, { params: { message } }),
            flags: MessageFlags.Ephemeral,
        });
    }
}
