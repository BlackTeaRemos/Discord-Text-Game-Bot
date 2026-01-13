import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import type { OrganizationPromptResult } from '../../../SubCommand/Prompt/Organization.js';
import { TASK_VIEW_ALL_ORGS_VALUE, TASK_VIEW_CLOSE_BUTTON_ID, TASK_VIEW_SELECT_ORG_MENU_ID } from './TaskViewIds.js';

export interface TaskViewOrgSelectRenderResult {
    content: string;
    components: Array<ActionRowBuilder<any>>;
}

/**
 * Render an organization selection prompt with an optional all-organizations option.
 * @param prompt OrganizationPromptResult Prepared prompt. @example prompt.status
 * @param allowAll boolean Whether to include all-organizations choice. @example true
 * @returns TaskViewOrgSelectRenderResult Content and components. @example RenderTaskViewOrgSelect(prompt,true)
 */
export function RenderTaskViewOrgSelect(
    prompt: OrganizationPromptResult,
    allowAll: boolean,
): TaskViewOrgSelectRenderResult {
    if (prompt.status === `prompt` && prompt.selection.orgs.length > 0) {
        const original = prompt.components?.[0];
        const menu = new StringSelectMenuBuilder()
            .setCustomId(TASK_VIEW_SELECT_ORG_MENU_ID)
            .setPlaceholder(`Select organization`);

        if (allowAll) {
            menu.addOptions({ label: `All organizations`, value: TASK_VIEW_ALL_ORGS_VALUE } as any);
        }

        for (const org of prompt.selection.orgs.slice(0, 24)) {
            menu.addOptions({ label: org.name.slice(0, 100), value: org.uid } as any);
        }

        return {
            content: prompt.message ?? `Choose organization to continue.`,
            components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
        };
    }

    if (prompt.status === `auto` && prompt.organization) {
        return {
            content: `Using organization: ${prompt.organization.name}`,
            components: [],
        };
    }

    return {
        content: prompt.message ?? `No organizations found.`,
        components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents([
                new ButtonBuilder().setCustomId(TASK_VIEW_CLOSE_BUTTON_ID).setLabel(`Close`).setStyle(ButtonStyle.Secondary),
            ]),
        ],
    };
}
