import type { ChatInputCommandInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import type { FlowBuilder } from '../../Common/Flow/Builder.js';
import type { StepContext } from '../../Common/Flow/Types.js';
import type { TaskFlowState } from './TaskFlowState.js';
import { GetGameCurrentTurn } from '../../Flow/Object/Game/Turn.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';

const TASK_SELECT_GAME_ID = `task_select_game`;

/**
 * Register the step that selects a game for task operations.
 * @param builder FlowBuilder<TaskFlowState> Flow builder to append steps to. @example registerTaskGameStep(builder, interaction)
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Base interaction. @example interaction
 * @returns FlowBuilder<TaskFlowState> Builder for chaining. @example registerTaskGameStep(builder, interaction).next()
 */
export function registerTaskGameStep(
    builder: FlowBuilder<TaskFlowState>,
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): FlowBuilder<TaskFlowState> {
    return builder
        .step(TASK_SELECT_GAME_ID, `task_game`)
        .prompt(async(ctx: StepContext<TaskFlowState>) => {
            const base = ctx.state.baseInteraction;
            const serverId = interaction.guildId;
            if (!serverId || !base) {
                await ctx.cancel();
                return;
            }
            if (ctx.state.requestedTaskId && ctx.state.action === `status`) {
                await ctx.advance();
                return;
            }
            if (ctx.state.gameUid) {
                if (!ctx.state.currentTurn) {
                    ctx.state.currentTurn = await GetGameCurrentTurn(ctx.state.gameUid);
                }
                await ctx.advance();
                return;
            }

            const games = await ListGamesForServer(serverId);
            const game = games[0];
            if (!game) {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                }
                await interaction.editReply({ content: `No game found in this server. Ask an admin to create one.`, components: [] });
                await ctx.cancel();
                return;
            }

            ctx.state.gameUid = game.uid;
            ctx.state.gameName = game.name;
            ctx.state.currentTurn = await GetGameCurrentTurn(game.uid);
            await ctx.advance();
        })
        .next();
}
