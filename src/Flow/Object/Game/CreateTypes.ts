import type { ActionRowBuilder, ButtonBuilder, ChatInputCommandInteraction, StringSelectMenuBuilder } from 'discord.js';
import type { StepContext } from '../../../Common/Flow/Types.js';
import type { GameCreateFlowState } from './CreateState.js';

/**
 * Step context specialization used throughout the game creation flow.
 */
export type GameCreateStepContext = StepContext<GameCreateFlowState>;

/**
 * Shared renderer callbacks used by the command layer to render Discord UI components.
 * @property BuildControlsContent (state) => string Generates control content string. @example renderers.BuildControlsContent(state)
 * @property RenderPreview (ctx) => Promise<void> Renders or updates the preview embed. @example await renderers.RenderPreview(ctx)
 * @property RenderControls (ctx, content, components?) => Promise<void> Renders or updates the control panel. @example await renderers.RenderControls(ctx, 'Ready')
 */
/* eslint-disable no-unused-vars */
export interface GameCreateRenderers {
    BuildControlsContent: (state: GameCreateFlowState) => string;
    RenderPreview: (ctx: GameCreateStepContext) => Promise<void>;
    RenderControls: (
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
