import { ActionRowBuilder, ButtonBuilder, MessageFlags, StringSelectMenuBuilder } from 'discord.js';
import type { GameCreateStepContext } from '../../../../Flow/Object/Game/CreateTypes.js';
import { log } from '../../../../Common/Log.js';
import { GameCreateFlowConstants } from '../../../../Flow/Object/Game/CreateState.js';
import { BuildControlRows } from './BuildControlRows.js';
import { RecallInteraction } from './RecallInteraction.js';

/**
 * Render or update the control panel message with optional custom components.
 * @param ctx GameCreateStepContext Flow state context. @example await RenderControls(ctx, 'Ready')
 * @param content string Descriptive content placed above the buttons. @example await RenderControls(ctx, 'Waiting')
 * @param components ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] Optional component override list. @example await RenderControls(ctx, 'Ready', customRows)
 * @returns Promise<void> Resolves once the control message is sent. @example await RenderControls(ctx, 'Ready')
 */
export async function RenderControls(ctx: GameCreateStepContext, content: string, components?: unknown): Promise<void> {
    const base = RecallInteraction(ctx);
    if (!base) {
        return;
    }
    const rows =
        (components as Array<ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>> | undefined) ??
        (BuildControlRows(ctx.state) as Array<ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>>);
    const payload = {
        content,
        components: rows,
    };
    try {
        if (!ctx.state.controlsMessageId) {
            const message = await base.followUp({ ...payload, flags: MessageFlags.Ephemeral });
            ctx.state.controlsMessageId = message.id;
        } else {
            await base.webhook.editMessage(ctx.state.controlsMessageId, payload);
        }
    } catch (error) {
        log.error(`Failed to render controls: ${String(error)}`, GameCreateFlowConstants.logSource, `RenderControls`);
    }
}
