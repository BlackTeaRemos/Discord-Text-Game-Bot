import { log } from '../../../../Common/Log.js';
import { UserCreateFlowConstants } from '../../../../Flow/Object/User/CreateState.js';
import type { UserCreateSession } from './UserCreateSessionStore.js';
import { BuildUserPreviewEmbed } from '../Renderers/BuildUserPreviewEmbed.js';
import { BuildUserCreateControlsContent } from '../Renderers/BuildUserCreateControlsContent.js';
import { BuildUserCreateControlRows } from '../Renderers/BuildUserCreateControlRows.js';
import { TranslateFromContext } from '../../../../Services/I18nService.js';

/**
 * Update the preview message for the supplied user creation session.
 * @param session UserCreateSession Session containing preview metadata. @example await UpdateUserCreateSessionPreview(session)
 * @returns Promise<void> Resolves after the message updates. @example await UpdateUserCreateSessionPreview(session)
 */
export async function UpdateUserCreateSessionPreview(session: UserCreateSession): Promise<void> {
    try {
        await session.baseInteraction.webhook.editMessage(session.previewMessageId, {
            content: TranslateFromContext((session.baseInteraction as any).executionContext, `userCreate.preview.message`),
            embeds: [BuildUserPreviewEmbed(session.state)],
        });
    } catch (error) {
        log.error(
            `Failed to update user preview for user ${session.userId}: ${String(error)}`,
            UserCreateFlowConstants.logSource,
            `UpdateUserCreateSessionPreview`,
        );
    }
}

/**
 * Update the control message for the supplied user creation session.
 * @param session UserCreateSession Session describing the control message. @example await UpdateUserCreateSessionControls(session)
 * @returns Promise<void> Resolves after the control panel updates. @example await UpdateUserCreateSessionControls(session)
 */
export async function UpdateUserCreateSessionControls(session: UserCreateSession): Promise<void> {
    try {
        await session.baseInteraction.webhook.editMessage(session.controlsMessageId, {
            content: BuildUserCreateControlsContent(session.state),
            components: BuildUserCreateControlRows(session.state),
        });
    } catch (error) {
        log.error(
            `Failed to update user controls for user ${session.userId}: ${String(error)}`,
            UserCreateFlowConstants.logSource,
            `UpdateUserCreateSessionControls`,
        );
    }
}
