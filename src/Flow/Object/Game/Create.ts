import type { FlowBuilder } from '../../../Common/Flow/Builder.js';
import type { GameCreateFlowState } from './CreateState.js';
import type { GameCreateStepContext } from './CreateTypes.js';

/**
 * Build the initial state backing the game creation flow.
 * @param options Object Seed containing Discord server identifier and optional defaults.
 * @returns GameCreateFlowState Initialized state used by the flow.
 */
export function createGameCreateState(options: { serverId: string; defaultName?: string }): GameCreateFlowState {
    return {
        serverId: options.serverId,
        defaultName: options.defaultName,
        gameName: options.defaultName?.trim() || `New game`,
        description: `No description provided yet.`,
    };
}

/**
 * Configure the interactive game creation flow using the supplied builder.
 * Command layer remains responsible for Discord rendering.
 * @param options Object containing the flow builder reference and optional memory seed.
 * @returns FlowBuilder<GameCreateFlowState> Builder reference for chaining or start invocation.
 */
export function StartGameCreateFlow(options: {
    builder: FlowBuilder<GameCreateFlowState>;
    memorySeed?: Record<string, unknown>;
    serverId: string;
    defaultName?: string;
}): FlowBuilder<GameCreateFlowState> {
    const { builder, memorySeed } = options;
    return builder
        .step(undefined, `root`)
        .prompt(async (ctx: GameCreateStepContext) => {
            if (memorySeed) {
                for (const [key, value] of Object.entries(memorySeed)) {
                    ctx.remember(key, value);
                }
            }
            ctx.state.serverId = options.serverId;
            ctx.state.defaultName = options.defaultName;
            ctx.state.gameName = ctx.state.gameName?.trim() || ctx.state.defaultName?.trim() || `New game`;
            ctx.state.description = ctx.state.description?.trim() || `No description provided yet.`;
            await ctx.advance();
        })
        .next()
        .step()
        .prompt(async (ctx: GameCreateStepContext) => {
            await ctx.advance();
        })
        .next();
}
