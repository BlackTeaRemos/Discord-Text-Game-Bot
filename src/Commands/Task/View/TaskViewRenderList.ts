import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import type { TaskFlowState } from '../TaskFlowState.js';
import type { TaskListItem } from '../../../Domain/Task.js';
import { SliceTaskViewPage } from './TaskViewPaging.js';
import {
    TASK_VIEW_ALL_BUTTON_ID,
    TASK_VIEW_CLOSE_BUTTON_ID,
    TASK_VIEW_CUSTOM_FILTER_BUTTON_ID,
    TASK_VIEW_NEXT_BUTTON_ID,
    TASK_VIEW_PREV_BUTTON_ID,
    TASK_VIEW_SELECT_ID,
    TASK_VIEW_SELECT_ORG_BUTTON_ID,
} from './TaskViewIds.js';

export interface TaskViewListRenderResult {
    embeds: EmbedBuilder[];
    components: Array<ActionRowBuilder<any>>;
}

function buildTitle(state: TaskFlowState): string {
    const parts: string[] = [];
    parts.push(`Tasks`);
    if (state.organizationNameFilter) {
        parts.push(state.organizationNameFilter);
    }
    if (state.gameName) {
        parts.push(state.gameName);
    }
    if (state.viewScope === `current_turn` && state.currentTurn) {
        parts.push(`turn ${state.currentTurn}`);
    }
    if (state.statusGroup && state.statusGroup !== `all`) {
        parts.push(state.statusGroup.replaceAll(`_`, ` `));
    }
    return parts.join(` • `);
}

/**
 * Render the paged task list view.
 * @param state TaskFlowState Current dashboard state. @example state.pageIndex
 * @param tasks TaskListItem[] Filtered tasks. @example []
 * @returns TaskViewListRenderResult Embeds and components. @example RenderTaskViewList(state, tasks)
 */
export function RenderTaskViewList(state: TaskFlowState, tasks: TaskListItem[]): TaskViewListRenderResult {
    const page = SliceTaskViewPage(tasks, state.pageIndex ?? 0, state.pageSize ?? 10);
    state.pageIndex = page.pageIndex;
    state.pageSize = page.pageSize;

    const embed = new EmbedBuilder().setTitle(buildTitle(state));

    if (tasks.length === 0) {
        embed.setDescription(`No tasks found for this filter.`);
    } else {
        const lines = page.items.map(task => {
            const owner = task.executorName || task.executorDiscordId || `Unassigned`;
            return `• [${task.status}] ${task.description.slice(0, 60)} (ID: ${task.id}, exec: ${owner})`;
        });
        embed.setDescription(lines.join(`\n`));
        embed.setFooter({ text: `Page ${page.pageIndex + 1} of ${page.totalPages}` });
    }

    const controls = new ActionRowBuilder<ButtonBuilder>().addComponents([
        new ButtonBuilder()
            .setCustomId(TASK_VIEW_PREV_BUTTON_ID)
            .setLabel(`Prev`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page.pageIndex <= 0),
        new ButtonBuilder()
            .setCustomId(TASK_VIEW_NEXT_BUTTON_ID)
            .setLabel(`Next`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page.pageIndex >= page.totalPages - 1),
        new ButtonBuilder().setCustomId(TASK_VIEW_ALL_BUTTON_ID).setLabel(`All tasks`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(TASK_VIEW_CUSTOM_FILTER_BUTTON_ID)
            .setLabel(`Filter`)
            .setStyle(ButtonStyle.Primary),
    ]);

    const meta = new ActionRowBuilder<ButtonBuilder>().addComponents([
        new ButtonBuilder().setCustomId(TASK_VIEW_SELECT_ORG_BUTTON_ID).setLabel(`Organization`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(TASK_VIEW_CLOSE_BUTTON_ID).setLabel(`Close`).setStyle(ButtonStyle.Secondary),
    ]);

    const rows: Array<ActionRowBuilder<any>> = [];

    if (tasks.length > 0) {
        const select = new StringSelectMenuBuilder()
            .setCustomId(TASK_VIEW_SELECT_ID)
            .setPlaceholder(`Select a task to manage`)
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(
                page.items.map(task => {
                    const rawLabel = `[${task.status}] ${task.description}`;
                    const label = rawLabel.length > 95 ? `${rawLabel.slice(0, 92)}...` : rawLabel;
                    return {
                        label,
                        value: task.id,
                    } as any;
                }),
            );
        rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
    }

    rows.push(controls, meta);

    return { embeds: [embed], components: rows };
}
