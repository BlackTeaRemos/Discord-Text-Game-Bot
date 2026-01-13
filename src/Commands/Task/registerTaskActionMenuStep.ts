import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { FlowBuilder } from '../../Common/Flow/Builder.js';
import type { StepContext } from '../../Common/Flow/Types.js';
import type { TaskFlowState, TaskFlowAction } from './TaskFlowState.js';
import { StartGameTurnFlow } from '../Object/Game/Turn.js';
import { MakeTaskActionButtonId, ParseTaskActionButtonId } from './TaskActionButtonCodec.js';

interface TaskActionButtonOption {
    action: TaskFlowAction;
    label: string;
    style: ButtonStyle;
}

/**
 * Build the list of task actions available to the current user.
 * @param isAdmin boolean Whether user has task admin permissions. @example true
 * @returns TaskActionButtonOption[] Button config list. @example [{ action: 'create', label: 'Create task', style: ButtonStyle.Success }]
 */
function buildTaskActionButtonOptions(isAdmin: boolean): TaskActionButtonOption[] {
    const base: TaskActionButtonOption[] = [
        { action: `create`, label: `Create task`, style: ButtonStyle.Success },
    ];

    if (isAdmin) {
        base.push({ action: `view_mine`, label: `View user tasks`, style: ButtonStyle.Primary });
        base.push({ action: `view_org`, label: `View organization tasks`, style: ButtonStyle.Primary });
        base.push({ action: `status`, label: `Set task status`, style: ButtonStyle.Secondary });
        base.push({ action: `assign`, label: `Assign executor`, style: ButtonStyle.Secondary });
        base.push({ action: `manage_turn`, label: `Manage current turn`, style: ButtonStyle.Secondary });
    }

    base.push({ action: `exit`, label: `Exit`, style: ButtonStyle.Danger });
    return base;
}

export function registerTaskActionMenuStep(builder: FlowBuilder<TaskFlowState>): FlowBuilder<TaskFlowState> {
    return builder
        .step(`task_action_btn_*`)
        .prompt(async(ctx: StepContext<TaskFlowState>) => {
            if (ctx.state.action && ctx.state.selectedTaskId) {
                await ctx.advance();
                return;
            }
            const base = ctx.state.baseInteraction;
            if (!base) {
                await ctx.cancel();
                return;
            }

            const buttonOptions = buildTaskActionButtonOptions(Boolean(ctx.state.isTaskAdmin));
            const buttons = buttonOptions.map(option => {
                return new ButtonBuilder()
                    .setCustomId(MakeTaskActionButtonId(option.action))
                    .setLabel(option.label)
                    .setStyle(option.style);
            });

            const rows: Array<ActionRowBuilder<ButtonBuilder>> = [];
            for (const chunkStartIndex of [0, 5, 10, 15, 20]) {
                const chunk = buttons.slice(chunkStartIndex, chunkStartIndex + 5);
                if (chunk.length === 0) {
                    break;
                }
                rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(chunk));
            }

            await base.editReply({
                content: `Select what you want to do with tasks${ctx.state.organizationName ? ` for **${ctx.state.organizationName}**` : ``}.`,
                components: rows,
            });
        })
        .onInteraction(async(ctx: StepContext<TaskFlowState>, choice) => {
            if (!choice.isButton()) {
                return false;
            }

            const parsedAction = ParseTaskActionButtonId(choice.customId);
            if (!parsedAction) {
                return false;
            }

            ctx.state.action = parsedAction as TaskFlowAction;
            ctx.state.viewScope = undefined;
            ctx.state.statusGroup = undefined;
            await choice.deferUpdate();
            if (ctx.state.action === `exit`) {
                const base = ctx.state.baseInteraction;
                if (base) {
                    await base.editReply({ content: `Task menu closed.`, components: [] });
                }
                await ctx.cancel();
                return false;
            }
            if (ctx.state.action === `manage_turn`) {
                const base = ctx.state.baseInteraction;
                if (!base) {
                    await ctx.cancel();
                    return false;
                }
                await ctx.cancel();
                await StartGameTurnFlow(base);
                return false;
            }
            return true;
        })
        .next();
}
