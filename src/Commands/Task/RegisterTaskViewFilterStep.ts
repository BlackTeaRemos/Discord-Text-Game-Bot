import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import type { FlowBuilder } from '../../Common/Flow/Builder.js';
import type { StepContext } from '../../Common/Flow/Types.js';
import type { TaskFlowState, TaskStatusGroup, TaskViewScope } from './TaskFlowState.js';
import { BuildTaskViewFilterOptions, ParseTaskViewFilterValue, type TaskViewFilterValue } from './TaskViewFilterValue.js';

const TASK_VIEW_FILTER_ID = `task_view_filter`;

/**
 * Register a filter selection step used before listing tasks.
 * @param builder FlowBuilder<TaskFlowState> Builder reference. @example registerTaskViewFilterStep(builder)
 * @returns FlowBuilder<TaskFlowState> Builder for chaining. @example registerTaskViewFilterStep(builder).next()
 */
export function registerTaskViewFilterStep(builder: FlowBuilder<TaskFlowState>): FlowBuilder<TaskFlowState> {
    return builder
        .step(TASK_VIEW_FILTER_ID, `task_view_filter`)
        .prompt(async(ctx: StepContext<TaskFlowState>) => {
            if (ctx.state.action !== `view_mine` && ctx.state.action !== `view_org`) {
                await ctx.advance();
                return;
            }
            const base = ctx.state.baseInteraction;
            if (!base) {
                await ctx.cancel();
                return;
            }
            if (!ctx.state.isTaskAdmin) {
                await base.editReply({ content: `You are not allowed to view tasks.`, components: [] });
                await ctx.cancel();
                return;
            }
            if (ctx.state.viewScope && ctx.state.statusGroup) {
                await ctx.advance();
                return;
            }
            const menu = new StringSelectMenuBuilder()
                .setCustomId(TASK_VIEW_FILTER_ID)
                .setPlaceholder(`Choose task filter`)
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(BuildTaskViewFilterOptions(ctx.state.currentTurn).map(item => {
                    return { label: item.label, value: item.value satisfies TaskViewFilterValue } as any;
                }));
            await base.editReply({
                content: `Select which tasks to view${ctx.state.gameName ? ` for **${ctx.state.gameName}**` : ``}.`,
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
            });
        })
        .onInteraction(async(ctx: StepContext<TaskFlowState>, interaction) => {
            if (!interaction.isStringSelectMenu()) {
                return false;
            }
            if (interaction.customId !== TASK_VIEW_FILTER_ID) {
                return false;
            }
            const parsed = ParseTaskViewFilterValue(interaction.values[0]);
            if (!parsed) {
                await interaction.reply({ content: `Invalid filter selection.`, ephemeral: true });
                return false;
            }
            ctx.state.viewScope = parsed.scope;
            ctx.state.statusGroup = parsed.group;
            await interaction.deferUpdate();
            return true;
        })
        .next();
}
