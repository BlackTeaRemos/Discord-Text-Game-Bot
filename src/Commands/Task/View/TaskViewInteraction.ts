import type { Interaction } from 'discord.js';
import type { StepContext } from '../../../Common/Flow/Types.js';
import type { TaskFlowState } from '../TaskFlowState.js';
import { ParseTaskViewFilterValue } from '../TaskViewFilterValue.js';
import { ResolveOrganizationName } from '../../../SubCommand/Prompt/Organization.js';
import {
    TASK_VIEW_ALL_BUTTON_ID,
    TASK_VIEW_ALL_ORGS_VALUE,
    TASK_VIEW_CLOSE_BUTTON_ID,
    TASK_VIEW_CUSTOM_FILTER_BUTTON_ID,
    TASK_VIEW_FILTER_MENU_ID,
    TASK_VIEW_NEXT_BUTTON_ID,
    TASK_VIEW_PREV_BUTTON_ID,
    TASK_VIEW_SELECT_ID,
    TASK_VIEW_SELECT_ORG_BUTTON_ID,
    TASK_VIEW_SELECT_ORG_MENU_ID,
} from './TaskViewIds.js';
import { PromptTaskView } from './TaskViewPrompt.js';

/**
 * Interaction handler for the task dashboard.
 * @param ctx StepContext<TaskFlowState> Step context. @example ctx.state.pageIndex
 * @param interaction Interaction Incoming Discord component interaction. @example interaction.isButton()
 * @returns Promise<boolean> Always false to keep the dashboard step active. @example false
 */
export async function HandleTaskViewInteraction(
    ctx: StepContext<TaskFlowState>,
    interaction: Interaction,
): Promise<boolean> {
    const base = ctx.state.baseInteraction;
    if (!base) {
        await ctx.cancel();
        return false;
    }

    if (interaction.isButton()) {
        if (interaction.customId === TASK_VIEW_CLOSE_BUTTON_ID) {
            await interaction.deferUpdate();
            await base.editReply({ content: `Task menu closed.`, embeds: [], components: [] });
            await ctx.cancel();
            return false;
        }
        if (interaction.customId === TASK_VIEW_PREV_BUTTON_ID) {
            ctx.state.pageIndex = Math.max((ctx.state.pageIndex ?? 0) - 1, 0);
            await interaction.deferUpdate();
            await PromptTaskView(ctx);
            return false;
        }
        if (interaction.customId === TASK_VIEW_NEXT_BUTTON_ID) {
            ctx.state.pageIndex = (ctx.state.pageIndex ?? 0) + 1;
            await interaction.deferUpdate();
            await PromptTaskView(ctx);
            return false;
        }
        if (interaction.customId === TASK_VIEW_ALL_BUTTON_ID) {
            ctx.state.viewScope = `all_turns`;
            ctx.state.statusGroup = `all`;
            ctx.state.pageIndex = 0;
            ctx.state.uiMode = `list`;
            await interaction.deferUpdate();
            await PromptTaskView(ctx);
            return false;
        }
        if (interaction.customId === TASK_VIEW_CUSTOM_FILTER_BUTTON_ID) {
            ctx.state.uiMode = `filter`;
            await interaction.deferUpdate();
            await PromptTaskView(ctx);
            return false;
        }
        if (interaction.customId === TASK_VIEW_SELECT_ORG_BUTTON_ID) {
            ctx.state.uiMode = `select_org`;
            await interaction.deferUpdate();
            await PromptTaskView(ctx);
            return false;
        }
        return false;
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === TASK_VIEW_FILTER_MENU_ID) {
            const parsed = ParseTaskViewFilterValue(interaction.values[0]);
            if (!parsed) {
                await interaction.reply({ content: `Invalid filter selection.`, ephemeral: true });
                return false;
            }
            ctx.state.viewScope = parsed.scope;
            ctx.state.statusGroup = parsed.group;
            ctx.state.pageIndex = 0;
            ctx.state.uiMode = `list`;
            await interaction.deferUpdate();
            await PromptTaskView(ctx);
            return false;
        }

        if (interaction.customId === TASK_VIEW_SELECT_ORG_MENU_ID) {
            const selected = interaction.values[0];
            if (selected === TASK_VIEW_ALL_ORGS_VALUE) {
                ctx.state.organizationUidFilter = null;
                ctx.state.organizationNameFilter = `All organizations`;
            } else {
                ctx.state.organizationUidFilter = selected;
                ctx.state.organizationNameFilter = (await ResolveOrganizationName(base.user.id, selected)) ?? selected;
            }
            ctx.state.pageIndex = 0;
            ctx.state.uiMode = `list`;
            await interaction.deferUpdate();
            await PromptTaskView(ctx);
            return false;
        }

        if (interaction.customId === TASK_VIEW_SELECT_ID) {
            ctx.state.selectedTaskId = interaction.values[0];
            await interaction.deferUpdate();
            return false;
        }
    }

    return false;
}
