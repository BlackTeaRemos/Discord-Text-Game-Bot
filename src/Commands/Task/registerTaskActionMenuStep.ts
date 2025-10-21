import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import type { FlowBuilder } from '../../Common/Flow/Builder.js';
import type { StepContext } from '../../Common/Flow/Types.js';
import type { TaskFlowState, TaskFlowAction } from './TaskFlowState.js';

function options(): Array<{ label: string; value: TaskFlowAction }> {
    return [
        { label: `Create task`, value: `create` },
        { label: `View my tasks`, value: `view_mine` },
        { label: `View organization tasks`, value: `view_org` },
        { label: `Set task status`, value: `status` },
        { label: `Assign executor`, value: `assign` },
        { label: `Exit`, value: `exit` },
    ];
}

export function registerTaskActionMenuStep(builder: FlowBuilder<TaskFlowState>): FlowBuilder<TaskFlowState> {
    return builder
        .step(`task_action_menu`)
        .prompt(async(ctx: StepContext<TaskFlowState>) => {
            const base = ctx.state.baseInteraction;
            if (!base) {
                await ctx.cancel();
                return;
            }
            const menu = new StringSelectMenuBuilder()
                .setCustomId(`task_action_menu`)
                .setPlaceholder(`Choose task action`)
                .addOptions(
                    options().map(item => {
                        return { label: item.label, value: item.value } as any;
                    }),
                );
            await base.editReply({
                content: `Select what you want to do with tasks${ctx.state.organizationName ? ` for **${ctx.state.organizationName}**` : ``}.`,
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
            });
        })
        .onInteraction(async(ctx: StepContext<TaskFlowState>, choice) => {
            if (!choice.isStringSelectMenu()) {
                return false;
            }
            ctx.state.action = choice.values[0] as TaskFlowAction;
            await choice.deferUpdate();
            if (ctx.state.action === `exit`) {
                const base = ctx.state.baseInteraction;
                if (base) {
                    await base.editReply({ content: `Task menu closed.`, components: [] });
                }
                await ctx.cancel();
                return false;
            }
            return true;
        })
        .next();
}
