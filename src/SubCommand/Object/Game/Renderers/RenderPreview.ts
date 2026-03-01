import type { GameCreateStepContext } from '../../../../Flow/Object/Game/CreateTypes.js';
import { Log } from '../../../../Common/Log.js';
import { GameCreateFlowConstants } from '../../../../Flow/Object/Game/CreateState.js';
import { BuildGamePreviewEmbed } from './BuildGamePreviewEmbed.js';
import { RecallInteraction } from './RecallInteraction.js';

/**
 * Render or update the preview embed message.
 * @param ctx GameCreateStepContext Flow execution context. @example await RenderPreview(ctx)
 * @returns Promise<void> Resolves after the preview is shown. @example await RenderPreview(ctx)
 */
export async function RenderPreview(ctx: GameCreateStepContext): Promise<void> {
    const base = RecallInteraction(ctx);
    if (!base) {
        return;
    }
    const embed = BuildGamePreviewEmbed(ctx.state);
    const payload = {
        content:
            ctx.state.mode === `update`
                ? `Preview of the game as it will appear after saving changes.`
                : `Preview of the game as it will appear after creation.`,
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
        Log.error(
            `Failed to render game preview: ${String(error)}`,
            GameCreateFlowConstants.logSource,
            `RenderPreview`,
        );
    }
}
