import { log } from '../../../../Common/Log.js';
import { OrganizationCreateFlowConstants } from '../../../../Flow/Object/Organization/CreateState.js';
import type { OrganizationCreateSession } from './OrganizationCreateSessionStore.js';
import { BuildOrganizationPreviewEmbed } from '../Renderers/BuildOrganizationPreviewEmbed.js';
import { BuildOrganizationCreateControlsContent } from '../Renderers/BuildOrganizationCreateControlsContent.js';
import { BuildOrganizationCreateControlRows } from '../Renderers/BuildOrganizationCreateControlRows.js';

/**
 * Update the preview message for the supplied organization creation session.
 * @param session OrganizationCreateSession Session containing preview metadata. @example await UpdateOrganizationCreateSessionPreview(session)
 * @returns Promise<void> Resolves after the message updates.
 */
export async function UpdateOrganizationCreateSessionPreview(session: OrganizationCreateSession): Promise<void> {
    try {
        await session.baseInteraction.webhook.editMessage(session.previewMessageId, {
            content: `Preview how your organization will appear once created.`,
            embeds: [BuildOrganizationPreviewEmbed(session.state)],
        });
    } catch (error) {
        log.error(
            `Failed to update organization preview for user ${session.userId}: ${String(error)}`,
            OrganizationCreateFlowConstants.logSource,
            `UpdateOrganizationCreateSessionPreview`,
        );
    }
}

/**
 * Update the control message for the supplied organization creation session.
 * @param session OrganizationCreateSession Session describing the control message. @example await UpdateOrganizationCreateSessionControls(session)
 * @returns Promise<void> Resolves after the control panel updates.
 */
export async function UpdateOrganizationCreateSessionControls(session: OrganizationCreateSession): Promise<void> {
    try {
        await session.baseInteraction.webhook.editMessage(session.controlsMessageId, {
            content: BuildOrganizationCreateControlsContent(session.state),
            components: BuildOrganizationCreateControlRows(session.state),
        });
    } catch (error) {
        log.error(
            `Failed to update organization controls for user ${session.userId}: ${String(error)}`,
            OrganizationCreateFlowConstants.logSource,
            `UpdateOrganizationCreateSessionControls`,
        );
    }
}
