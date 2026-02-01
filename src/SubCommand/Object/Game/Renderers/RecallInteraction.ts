import type { ChatInputCommandInteraction } from 'discord.js';
import type { GameCreateStepContext } from '../../../../Flow/Object/Game/CreateTypes.js';

/**
 * Retrieve the root chat command interaction stored in flow memory.
 * @param ctx GameCreateStepContext Current flow context. @example const base = RecallInteraction(ctx)
 * @returns ChatInputCommandInteraction | undefined Stored interaction when available.
 */
export function RecallInteraction(ctx: GameCreateStepContext): ChatInputCommandInteraction | undefined {
    return ctx.recall<ChatInputCommandInteraction | undefined>(`root`, `interaction`);
}
