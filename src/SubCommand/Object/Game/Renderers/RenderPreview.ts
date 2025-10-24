import type { GameCreateStepContext } from '../../../../Flow/Object/Game/CreateTypes.js';
import { recallBaseInteraction } from '../../../../Flow/Object/Game/CreateTypes.js';
import { log } from '../../../../Common/Log.js';
import { GameCreateFlowConstants } from '../../../../Flow/Object/Game/CreateState.js';
import { BuildGamePreviewEmbed } from './BuildGamePreviewEmbed.js';

/**
 * Render or update the preview embed message.
 * @param ctx GameCreateStepContext Flow execution context. @example await RenderPreview(ctx)
 * @returns Promise<void> Resolves after the preview is shown. @example await RenderPreview(ctx)
 */
export async function RenderPreview(ctx: GameCreateStepContext): Promise<void> {
    const base = recallBaseInteraction(ctx);
    if (!base) {
        return;
    }
    const embed = BuildGamePreviewEmbed(ctx.state);
    const payload = {
        content: `Preview of the game as it will appear after creation.`,
        embeds: [embed],
    };
    try {
        if (!ctx.state.previewMessageId) {
            const message = await base.editReply(payload);
            ctx.state.previewMessageId = message.id;
        } else {
            await base.webhook.editMessage(ctx.state.previewMessageId, payload);
        }
    } catch (error) {
        log.error(
            `Failed to render game preview: ${String(error)}`,
            GameCreateFlowConstants.logSource,
            `RenderPreview`,
        );
    }
}
