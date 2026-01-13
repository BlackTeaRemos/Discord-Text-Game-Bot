import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import type { TaskFlowState } from '../TaskFlowState.js';
import { BuildTaskViewFilterOptions, type TaskViewFilterValue } from '../TaskViewFilterValue.js';
import { TASK_VIEW_CLOSE_BUTTON_ID, TASK_VIEW_FILTER_MENU_ID } from './TaskViewIds.js';

export interface TaskViewFilterRenderResult {
    components: Array<ActionRowBuilder<any>>;
}

/**
 * Render the filter selection menu.
 * @param state TaskFlowState Current state. @example state.currentTurn
 * @returns TaskViewFilterRenderResult Component rows. @example RenderTaskViewFilter(state)
 */
export function RenderTaskViewFilter(state: TaskFlowState): TaskViewFilterRenderResult {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(TASK_VIEW_FILTER_MENU_ID)
        .setPlaceholder(`Choose task filter`)
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            BuildTaskViewFilterOptions(state.currentTurn).map(item => {
                return { label: item.label, value: item.value satisfies TaskViewFilterValue } as any;
            }),
        );

    const controls = new ActionRowBuilder<ButtonBuilder>().addComponents([
        new ButtonBuilder().setCustomId(TASK_VIEW_CLOSE_BUTTON_ID).setLabel(`Close`).setStyle(ButtonStyle.Secondary),
    ]);

    return {
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu), controls],
    };
}
