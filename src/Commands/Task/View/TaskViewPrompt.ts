import type { StepContext } from '../../../Common/Flow/Types.js';
import type { TaskFlowState } from '../TaskFlowState.js';
import { FetchTasksForViewer } from '../../../Flow/Task/FetchTasksForViewer.js';
import { neo4jClient } from '../../../Setup/Neo4j.js';
import { ResolveStatusesForGroup } from '../../../Flow/Task/ResolveStatusesForGroup.js';
import { ApplyTaskViewDefaults } from './TaskViewStateDefaults.js';
import { RenderTaskViewList } from './TaskViewRenderList.js';
import { RenderTaskViewFilter } from './TaskViewRenderFilter.js';
import { PrepareOrganizationPrompt } from '../../../SubCommand/Prompt/Organization.js';
import { RenderTaskViewOrgSelect } from './TaskViewRenderOrgSelect.js';
import { TASK_VIEW_SELECT_ORG_MENU_ID } from './TaskViewIds.js';

/**
 * Prompt handler that renders the task dashboard.
 * @param ctx StepContext<TaskFlowState> Flow context. @example await PromptTaskView(ctx)
 * @returns Promise<void> Resolves after reply update. @example void
 */
export async function PromptTaskView(ctx: StepContext<TaskFlowState>): Promise<void> {
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

    ApplyTaskViewDefaults(ctx.state);
    ctx.state.uiMode = ctx.state.uiMode ?? `list`;

    if (ctx.state.uiMode === `filter`) {
        const rendered = RenderTaskViewFilter(ctx.state);
        await base.editReply({ content: `Select which tasks to view.`, embeds: [], components: rendered.components });
        return;
    }

    if (ctx.state.uiMode === `select_org`) {
        const prompt = await PrepareOrganizationPrompt({
            userId: base.user.id,
            customId: TASK_VIEW_SELECT_ORG_MENU_ID,
            placeholder: `Select organization`,
            promptMessage: `Choose organization to filter tasks.`,
            emptyMessage: `No organizations found.`,
            limit: 25,
        });
        if (prompt.status === `auto` && prompt.organization) {
            ctx.state.organizationUidFilter = prompt.organization.uid;
            ctx.state.organizationNameFilter = prompt.organization.name;
            ctx.state.uiMode = `list`;
        } else {
            const rendered = RenderTaskViewOrgSelect(prompt, true);
            await base.editReply({ content: rendered.content, embeds: [], components: rendered.components });
            return;
        }
    }

    const activeStatuses = ResolveStatusesForGroup(ctx.state.statusGroup ?? `todo`);
    const orgUid = ctx.state.organizationUidFilter ?? null;
    const gameUid = ctx.state.gameUid ?? null;
    const turnNumber = ctx.state.viewScope === `current_turn` ? (ctx.state.currentTurn ?? null) : null;

    const tasks = await FetchTasksForViewer(neo4jClient, {
        organizationUid: orgUid,
        viewerDiscordId: base.user.id,
        gameUid,
        turnNumber,
        includeAll: true,
        allowOverride: true,
        targetDiscordId: null,
        statuses: activeStatuses,
    });

    ctx.state.pendingTaskList = tasks;

    const rendered = RenderTaskViewList(ctx.state, tasks);
    await base.editReply({ content: `Task list`, embeds: rendered.embeds, components: rendered.components });
}
