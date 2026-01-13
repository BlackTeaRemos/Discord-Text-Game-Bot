import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { GamePromptResult } from '../../../SubCommand/Prompt/Game.js';
import { TASK_VIEW_CLOSE_BUTTON_ID } from './TaskViewIds.js';

export interface TaskViewGameSelectRenderResult {
    content: string;
    components: Array<ActionRowBuilder<any>>;
}

/**
 * Render a prepared game selection prompt.
 * @param prompt GamePromptResult Prepared prompt. @example prompt.status
 * @returns TaskViewGameSelectRenderResult Content and components. @example RenderTaskViewGameSelect(prompt)
 */
export function RenderTaskViewGameSelect(prompt: GamePromptResult): TaskViewGameSelectRenderResult {
    if (prompt.status === `prompt`) {
        return {
            content: prompt.message ?? `Choose game to continue.`,
            components: prompt.components ?? [],
        };
    }
    return {
        content: prompt.message ?? `No games found in this server.`,
        components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents([
                new ButtonBuilder().setCustomId(TASK_VIEW_CLOSE_BUTTON_ID).setLabel(`Close`).setStyle(ButtonStyle.Secondary),
            ]),
        ],
    };
}
