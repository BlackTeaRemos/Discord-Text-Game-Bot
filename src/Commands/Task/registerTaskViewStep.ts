import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import type { FlowBuilder } from '../../Common/Flow/Builder.js';
import type { StepContext } from '../../Common/Flow/Types.js';
import { FetchTasksForViewer } from '../../Flow/Task/FetchTasksForViewer.js';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { resolve } from '../../Common/permission/index.js';
import { RequestPermissionFromAdmin } from '../../SubCommand/Permission/PermissionUI.js';
import type { TaskFlowState } from './TaskFlowState.js';
import { DEFAULT_TASK_STATUSES } from '../../Domain/Task.js';
import type { TaskListItem } from '../../Domain/Task.js';
import { UpdateTaskStatus } from '../../Flow/Task/UpdateTaskStatus.js';
import { AssignTaskExecutor } from '../../Flow/Task/AssignTaskExecutor.js';
import { buildExecutorOptions, resolveExecutorSelection } from './taskExecutorOptions.js';

const TASK_VIEW_SELECT_ID = `task_view_select`;
const TASK_SELECTED_ACTION_ID = `task_selected_action`;
const TASK_STATUS_SELECT_ID = `task_status_select`;
const TASK_ASSIGN_SELECT_ID = `task_assign_select`;
const TASK_STATUS_BUTTON_ID = `task_action_status`;
const TASK_ASSIGN_BUTTON_ID = `task_action_assign`;
const TASK_CLOSE_BUTTON_ID = `task_action_close`;

/**
 * Create a button custom id for a specific status choice.
 * @param status string Task status value. @example 'active'
 * @returns string Button custom id for the status. @example 'task_status_btn_active'
 */
function makeStatusButtonId(status: string): string {
    return `task_status_btn_${status.replace(/\s+/g, `_`).toLowerCase()}`;
}

/**
 * Registers task viewing and post-selection operation steps on the supplied flow builder.
 * @param builder FlowBuilder<TaskFlowState> Flow builder used to append task interaction steps. @example registerTaskViewStep(flowBuilder)
 * @returns FlowBuilder<TaskFlowState> Builder reference for continued chaining. @example registerTaskViewStep(flowBuilder).step('next')
 */
export function registerTaskViewStep(builder: FlowBuilder<TaskFlowState>): FlowBuilder<TaskFlowState> {
    return builder
        .step(TASK_VIEW_SELECT_ID, `task_view`)
        .prompt(async(ctx: StepContext<TaskFlowState>) => {
            const action = ctx.state.action;
            if (action !== `view_mine` && action !== `view_org`) {
                await ctx.advance();
                return;
            }
            const base = ctx.state.baseInteraction;
            const orgUid = ctx.state.organizationUid;
            if (!base || !orgUid) {
                await ctx.cancel();
                return;
            }
            const includeAll = action === `view_org`;
            if (includeAll && base.guild) {
                const member = await base.guild.members.fetch(base.user.id).catch(() => {
                    return null;
                });
                const token = [`task`, `organization`, orgUid, `list`];
                const resolution = await resolve([token], {
                    context: { commandName: `task`, organizationUid: orgUid, userId: base.user.id },
                    member,
                    requestApproval: payload => {
                        return RequestPermissionFromAdmin(base, payload);
                    },
                });
                if (!resolution.success) {
                    await base.editReply({ content: resolution.detail.reason ?? `Permission denied.`, components: [] });
                    await ctx.cancel();
                    return;
                }
            }
            const tasks = await FetchTasksForViewer(neo4jClient, {
                organizationUid: orgUid,
                viewerDiscordId: base.user.id,
                includeAll,
            });
            const uniqueTasks: TaskListItem[] = [];
            const seenTaskIds = new Set<string>();
            for (const task of tasks) {
                if (seenTaskIds.has(task.id)) {
                    continue;
                }
                seenTaskIds.add(task.id);
                uniqueTasks.push(task);
            }
            if (uniqueTasks.length === 0) {
                await base.editReply({ content: `No tasks found.`, components: [] });
                await ctx.cancel();
                return;
            }
            const visibleTasks = uniqueTasks.slice(0, 25);
            const lines = visibleTasks.slice(0, 20).map(task => {
                const owner = task.executorName || task.executorDiscordId || `Unassigned`;
                return `• [${task.status}] ${task.description.slice(0, 60)} (ID: ${task.id}, exec: ${owner})`;
            });
            ctx.state.pendingTaskList = uniqueTasks;
            ctx.state.selectedTaskId = undefined;
            ctx.state.latestTask = undefined;
            const embed = new EmbedBuilder().setTitle(includeAll ? `Organization tasks` : `My tasks`).setDescription(
                lines.join(`
`),
            );
            // Interaction listing visible tasks so the viewer can choose a specific record to manage.
            const select = new StringSelectMenuBuilder()
                .setCustomId(TASK_VIEW_SELECT_ID)
                .setPlaceholder(`Select a task to manage`)
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(
                    visibleTasks.map(task => {
                        const owner = (task.executorName || task.executorDiscordId || `Unassigned`).slice(0, 75);
                        const rawLabel = `[${task.status}] ${task.description}`;
                        const label = rawLabel.length > 95 ? `${rawLabel.slice(0, 92)}...` : rawLabel;
                        return {
                            label,
                            description: `Exec: ${owner}`,
                            value: task.id,
                        } as any;
                    }),
                );
            await base.editReply({
                content: `Showing tasks, choose one to continue.`,
                embeds: [embed],
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
            });
        })
        .onInteraction(async(ctx: StepContext<TaskFlowState>, choice) => {
            if (!choice.isStringSelectMenu() || choice.customId !== TASK_VIEW_SELECT_ID) {
                return false;
            }
            const selectedId = choice.values[0];
            const tasks = ctx.state.pendingTaskList ?? [];
            const task = tasks.find(item => {
                return item.id === selectedId;
            });
            if (!task) {
                await choice.reply({ content: `Task not found, try again.`, ephemeral: true });
                return false;
            }
            ctx.state.selectedTaskId = task.id;
            ctx.state.latestTask = task;
            await choice.deferUpdate();
            return true;
        })
        .next()
        .step([TASK_STATUS_BUTTON_ID, TASK_ASSIGN_BUTTON_ID, TASK_CLOSE_BUTTON_ID], `task_selected_action`)
        .prompt(async(ctx: StepContext<TaskFlowState>) => {
            if (!ctx.state.selectedTaskId || !ctx.state.latestTask) {
                await ctx.advance();
                return;
            }
            const base = ctx.state.baseInteraction;
            if (!base) {
                await ctx.cancel();
                return;
            }
            const task = ctx.state.latestTask;
            const embed = new EmbedBuilder()
                .setTitle(`Task ${task.id}`)
                .setDescription(task.description)
                .addFields(
                    { name: `Status`, value: task.status, inline: true },
                    {
                        name: `Executor`,
                        value: task.executorName ? `${task.executorName} (${task.executorDiscordId})` : `Unassigned`,
                        inline: true,
                    },
                );
            // Action buttons allow direct access to status updates and assignment without selecting via menu.
            const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents([
                new ButtonBuilder()
                    .setCustomId(TASK_STATUS_BUTTON_ID)
                    .setLabel(`Set status`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(TASK_ASSIGN_BUTTON_ID)
                    .setLabel(`Assign executor`)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(TASK_CLOSE_BUTTON_ID).setLabel(`Close`).setStyle(ButtonStyle.Secondary),
            ]);
            await base.editReply({
                content: `Task selected. Choose what to do next.`,
                embeds: [embed],
                components: [buttons],
            });
        })
        .onInteraction(async(ctx: StepContext<TaskFlowState>, interaction) => {
            if (!interaction.isButton()) {
                return false;
            }
            await interaction.deferUpdate();
            if (interaction.customId === TASK_CLOSE_BUTTON_ID) {
                const base = ctx.state.baseInteraction;
                if (base) {
                    await base.editReply({ content: `Task menu closed.`, embeds: [], components: [] });
                }
                await ctx.cancel();
                return false;
            }
            if (interaction.customId === TASK_STATUS_BUTTON_ID) {
                ctx.state.action = `status`;
                ctx.state.awaitingStatus = true;
                return true;
            }
            if (interaction.customId === TASK_ASSIGN_BUTTON_ID) {
                ctx.state.action = `assign`;
                ctx.state.awaitingAssignment = true;
                return true;
            }
            return false;
        })
        .next()
        .step(`task_status_btn_*`, `task_status`)
        .prompt(async(ctx: StepContext<TaskFlowState>) => {
            if (!ctx.state.awaitingStatus || ctx.state.action !== `status`) {
                await ctx.advance();
                return;
            }
            const base = ctx.state.baseInteraction;
            const task = ctx.state.latestTask;
            if (!base || !task) {
                await ctx.cancel();
                return;
            }
            const statuses = Array.from(
                new Set<string>(
                    [...DEFAULT_TASK_STATUSES, task.status].map(status => {
                        return status.trim();
                    }),
                ),
            ).filter(status => {
                return status.length > 0;
            });
            // Store the valid status buttons for validation during interaction.
            const statusButtonIds = statuses.map(s => {
                return makeStatusButtonId(s);
            });
            ctx.remember(`statusButtonIds`, statusButtonIds);
            // Status buttons allow direct selection without multi-step interaction.
            const statusButtons: ButtonBuilder[] = statuses.map(status => {
                return new ButtonBuilder()
                    .setCustomId(makeStatusButtonId(status))
                    .setLabel(status)
                    .setStyle(status === task.status ? ButtonStyle.Success : ButtonStyle.Secondary);
            });
            const rows: ActionRowBuilder<ButtonBuilder>[] = [];
            for (let i = 0; i < statusButtons.length; i += 5) {
                rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(statusButtons.slice(i, i + 5)));
            }
            const embed = new EmbedBuilder()
                .setTitle(`Update status for ${task.id}`)
                .setDescription(task.description)
                .addFields({ name: `Current status`, value: task.status, inline: true });
            await base.editReply({
                content: `Choose new status.`,
                embeds: [embed],
                components: rows,
            });
        })
        .onInteraction(async(ctx: StepContext<TaskFlowState>, interaction) => {
            if (!interaction.isButton()) {
                return false;
            }
            const customId = interaction.customId;
            if (!customId.startsWith(`task_status_btn_`)) {
                return false;
            }
            const status = customId.replace(/^task_status_btn_/, ``).replace(/_/g, ` `);
            const orgUid = ctx.state.organizationUid;
            const base = ctx.state.baseInteraction;
            const taskId = ctx.state.selectedTaskId;
            if (!status || !orgUid || !base || !taskId) {
                await ctx.cancel();
                return false;
            }
            await interaction.deferUpdate();
            const updated = await UpdateTaskStatus(neo4jClient, {
                organizationUid: orgUid,
                taskId,
                status,
                viewerDiscordId: base.user.id,
            });
            if (!updated) {
                await base.editReply({ content: `Unable to update task status.`, components: [] });
                await ctx.cancel();
                return false;
            }
            ctx.state.latestTask = updated;
            ctx.state.awaitingStatus = false;
            ctx.state.action = undefined;
            const embed = new EmbedBuilder()
                .setTitle(`Task ${updated.id}`)
                .setDescription(updated.description)
                .addFields({ name: `Status`, value: updated.status, inline: true });
            await base.editReply({
                content: `Task status updated to **${updated.status}**.`,
                embeds: [embed],
                components: [],
            });
            return true;
        })
        .next()
        .step([TASK_ASSIGN_BUTTON_ID, TASK_ASSIGN_SELECT_ID], `task_assign`)
        .prompt(async(ctx: StepContext<TaskFlowState>) => {
            if (!ctx.state.awaitingAssignment || ctx.state.action !== `assign`) {
                await ctx.advance();
                return;
            }
            const base = ctx.state.baseInteraction;
            const orgUid = ctx.state.organizationUid;
            const task = ctx.state.latestTask;
            if (!base || !orgUid || !task) {
                await ctx.cancel();
                return;
            }
            const options = await buildExecutorOptions(orgUid, base.user.id);
            // Interaction allowing the viewer to reassign the selected task to a different executor.
            const menu = new StringSelectMenuBuilder()
                .setCustomId(TASK_ASSIGN_SELECT_ID)
                .setPlaceholder(`Select executor`)
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(options as any);
            const embed = new EmbedBuilder()
                .setTitle(`Assign executor for ${task.id}`)
                .setDescription(task.description)
                .addFields({
                    name: `Current executor`,
                    value: task.executorName ? `${task.executorName} (${task.executorDiscordId})` : `Unassigned`,
                    inline: true,
                });
            await base.editReply({
                content: `Choose who should execute this task.`,
                embeds: [embed],
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
            });
        })
        .onInteraction(async(ctx: StepContext<TaskFlowState>, interaction) => {
            if (!interaction.isStringSelectMenu() || interaction.customId !== TASK_ASSIGN_SELECT_ID) {
                return false;
            }
            const base = ctx.state.baseInteraction;
            const orgUid = ctx.state.organizationUid;
            const taskId = ctx.state.selectedTaskId;
            if (!base || !orgUid || !taskId) {
                await ctx.cancel();
                return false;
            }
            const selection = interaction.values[0];
            ctx.state.executorDiscordId = resolveExecutorSelection(selection);
            await interaction.deferUpdate();
            const updated = await AssignTaskExecutor(neo4jClient, {
                organizationUid: orgUid,
                taskId,
                executorDiscordId: ctx.state.executorDiscordId,
                viewerDiscordId: base.user.id,
            });
            if (!updated) {
                await base.editReply({ content: `Unable to update executor.`, components: [] });
                await ctx.cancel();
                return false;
            }
            ctx.state.latestTask = updated;
            ctx.state.awaitingAssignment = false;
            ctx.state.action = undefined;
            const executorLabel = updated.executorName
                ? `${updated.executorName} (${updated.executorDiscordId ?? `unknown`})`
                : `Unassigned`;
            const embed = new EmbedBuilder()
                .setTitle(`Task ${updated.id}`)
                .setDescription(updated.description)
                .addFields(
                    { name: `Status`, value: updated.status, inline: true },
                    { name: `Executor`, value: executorLabel, inline: true },
                );
            await base.editReply({
                content: `Executor updated successfully.`,
                embeds: [embed],
                components: [],
            });
            return true;
        })
        .next();
}
