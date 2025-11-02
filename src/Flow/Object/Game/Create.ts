import type { FlowBuilder } from '../../../Common/Flow/Builder.js';
import { sanitizeDescriptionText } from '../Description/BuildDefinition.js';
import type { Game } from './CreateRecord.js';
import { GameCreateFlowConstants, type GameCreateFlowState } from './CreateState.js';
import type { GameCreateStepContext } from './CreateTypes.js';

/**
 * Build the initial state backing the game creation flow.
 * @param options Object Seed containing Discord server identifier and optional defaults.
 * @returns GameCreateFlowState Initialized state used by the flow.
 */
export function createGameCreateState(options: {
    serverId: string;
    ownerDiscordId: string;
    defaultName?: string;
}): GameCreateFlowState {
    const defaultName = options.defaultName?.trim() || `New game`;
    const defaultDescription = sanitizeDescriptionText(`No description provided yet.`);

    return {
        serverId: options.serverId,
        mode: `create`,
        ownerDiscordId: options.ownerDiscordId,
        defaultName,
        gameName: defaultName,
        originalName: defaultName,
        description: defaultDescription,
        originalDescription: defaultDescription,
        imageUrl: GameCreateFlowConstants.defaultImageUrl,
        originalImageUrl: GameCreateFlowConstants.defaultImageUrl,
        controlsLocked: false,
    };
}

/**
 * Build the initial state when updating an existing game.
 * @param options Object containing persisted game data and customization scope.
 * @returns GameCreateFlowState Initialized state prepared for update interactions.
 */
export function createGameUpdateState(options: {
    serverId: string;
    ownerDiscordId: string;
    game: Game;
    description?: string;
    organizationUid?: string;
    organizationName?: string;
}): GameCreateFlowState {
    const description = sanitizeDescriptionText(options.description ?? options.game.description ?? undefined);
    return {
        serverId: options.serverId,
        mode: `update`,
        ownerDiscordId: options.ownerDiscordId,
        defaultName: options.game.name,
        organizationUid: options.organizationUid,
        organizationName: options.organizationName,
        gameUid: options.game.uid,
        gameName: options.game.name,
        originalName: options.game.name,
        description,
        originalDescription: description,
        imageUrl: options.game.image,
        originalImageUrl: options.game.image,
        controlsLocked: false,
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
            ctx.state.mode = ctx.state.mode ?? `create`;
            ctx.state.gameName = ctx.state.gameName?.trim() || ctx.state.defaultName?.trim() || `New game`;
            ctx.state.description = sanitizeDescriptionText(ctx.state.description);
            ctx.state.originalDescription = ctx.state.originalDescription ?? ctx.state.description;
            ctx.state.imageUrl = ctx.state.imageUrl ?? GameCreateFlowConstants.defaultImageUrl;
            ctx.state.originalImageUrl = ctx.state.originalImageUrl ?? GameCreateFlowConstants.defaultImageUrl;
            await ctx.advance();
        })
        .next()
        .step()
        .prompt(async (ctx: GameCreateStepContext) => {
            await ctx.advance();
        })
        .next();
}
