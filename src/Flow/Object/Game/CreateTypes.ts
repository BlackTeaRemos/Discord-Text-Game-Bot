import type { ActionRowBuilder, ButtonBuilder, ChatInputCommandInteraction, StringSelectMenuBuilder } from 'discord.js';
import type { StepContext } from '../../../Common/Flow/Types.js';
import type { GameCreateFlowState } from './CreateState.js';

/**
 * Step context specialization used throughout the game creation flow.
 */
export type GameCreateStepContext = StepContext<GameCreateFlowState>;

/**
 * Shared renderer callbacks used by the command layer to render Discord UI components.
 * @property buildControlsContent (state) => string Generates control content string. @example renderers.buildControlsContent(state)
 * @property renderPreview (ctx) => Promise<void> Renders or updates the preview embed. @example await renderers.renderPreview(ctx)
 * @property renderControls (ctx, content, components?) => Promise<void> Renders or updates the control panel. @example await renderers.renderControls(ctx, 'Ready')
 */
/* eslint-disable no-unused-vars */
export interface GameCreateRenderers {
    buildControlsContent: (state: GameCreateFlowState) => string;
    renderPreview: (ctx: GameCreateStepContext) => Promise<void>;
    renderControls: (
        ctx: GameCreateStepContext,
        content: string,
        components?: Array<ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>>,
    ) => Promise<void>;
}
/* eslint-enable no-unused-vars */

/**
 * Recall helper for retrieving the root chat command interaction from flow memory.
 * @param ctx GameCreateStepContext Current flow step context. @example const base = recallBaseInteraction(ctx)
 * @returns ChatInputCommandInteraction | undefined Stored interaction instance.
 */
export function recallBaseInteraction(ctx: GameCreateStepContext): ChatInputCommandInteraction | undefined {
    return ctx.recall<ChatInputCommandInteraction | undefined>(`root`, `interaction`);
}

/**
 * Recall helper for retrieving renderer callbacks registered by the command layer.
 * @param ctx GameCreateStepContext Current flow step context. @example const renderers = recallRenderers(ctx)
 * @returns GameCreateRenderers | undefined Renderer callbacks provided during flow initialization.
 */
export function recallRenderers(ctx: GameCreateStepContext): GameCreateRenderers | undefined {
    return ctx.recall<GameCreateRenderers | undefined>(`root`, `renderers`);
}
