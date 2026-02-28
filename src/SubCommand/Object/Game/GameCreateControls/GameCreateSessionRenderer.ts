import { log } from '../../../../Common/Log.js';
import { BuildGamePreviewEmbed } from '../Renderers/BuildGamePreviewEmbed.js';
import { BuildControlsContent } from '../Renderers/BuildControlsContent.js';
import { BuildControlRows } from '../Renderers/BuildControlRows.js';
import { GameCreateFlowConstants } from '../../../../Flow/Object/Game/CreateState.js';
import type { GameCreateSession } from './GameCreateSessionStore.js';
import { ResolveGameCreatePreviewHeading } from './ResolveGameCreatePreviewHeading.js';

/**
 * Update the preview message for the supplied session.
 * @param session GameCreateSession Session containing preview metadata. @example await UpdateGameCreateSessionPreview(session)
 * @returns Promise<void> Resolves after the message updates. @example await UpdateGameCreateSessionPreview(session)
 */
export async function UpdateGameCreateSessionPreview(session: GameCreateSession): Promise<void> {
    try {
        await session.baseInteraction.webhook.editMessage(session.previewMessageId, {
            content: ResolveGameCreatePreviewHeading(session.state),
            embeds: [BuildGamePreviewEmbed(session.state)],
        });
    } catch(error) {
        log.error(
            `Failed to update game preview for user ${session.userId}: ${error instanceof Error ? error.message : String(error)}`,
            GameCreateFlowConstants.logSource,
        );
    }
}

/**
 * Update the control message for the supplied session.
 * @param session GameCreateSession Session describing the control message. @example await UpdateGameCreateSessionControls(session)
 * @returns Promise<void> Resolves after controls update. @example await UpdateGameCreateSessionControls(session)
 */
export async function UpdateGameCreateSessionControls(session: GameCreateSession): Promise<void> {
    try {
        await session.baseInteraction.webhook.editMessage(session.controlsMessageId, {
            content: BuildControlsContent(session.state),
            components: BuildControlRows(session.state),
        });
    } catch(error) {
        log.error(
            `Failed to update game controls for user ${session.userId}: ${error instanceof Error ? error.message : String(error)}`,
            GameCreateFlowConstants.logSource,
        );
    }
}
