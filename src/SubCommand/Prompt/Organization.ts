import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { Translate } from '../../Services/I18nService.js';

/**
 * States returned when preparing an organization selection prompt
 * @example const status: OrganizationPromptStatus = 'prompt';
 */
export type OrganizationPromptStatus = `empty` | `auto` | `prompt`;

/**
 * Minimal organization selection payload for prompts
 */
export interface OrganizationSelection {
    selected: boolean;
    orgs: Array<{ uid: string; name: string }>;
}

/**
 * Options accepted when building an organization selection prompt
 */
export interface OrganizationPromptOptions {
    userId: string;
    customId: string;
    placeholder?: string;
    promptMessage?: string;
    emptyMessage?: string;
    limit?: number;
}

/**
 * Result describing how the caller should proceed after preparing the prompt
 */
export interface OrganizationPromptResult {
    status: OrganizationPromptStatus;
    selection: OrganizationSelection;
    components?: ActionRowBuilder<StringSelectMenuBuilder>[];
    message?: string;
    organization?: { uid: string; name: string };
}

/**
 * Prepare an organization selection prompt handling empty and auto select cases
 * @param options OrganizationPromptOptions Configuration describing the prompt @example await PrepareOrganizationPrompt({ userId, customId: 'select', placeholder: 'Select org' });
 * @returns OrganizationPromptResult Result instructing caller whether to prompt or auto select @example const prompt = await PrepareOrganizationPrompt(opts);
 */
export async function PrepareOrganizationPrompt(options: OrganizationPromptOptions): Promise<OrganizationPromptResult> {
    // Organizations disabled so return an empty result indicating no selectable organizations
    return {
        status: `empty`,
        selection: { selected: false, orgs: [] },
        message: options.emptyMessage ?? Translate(`organizationPrompt.disabled`),
    };
}

/**
 * Resolve a human friendly organization name for the supplied organization uid
 * @param userId string Discord user id owning the organizations @example '123456789012345678'
 * @param organizationUid string Organization uid to resolve @example 'org_1'
 * @returns string or undefined Resolved name or undefined when not found @example const name = await ResolveOrganizationName(userId, orgUid);
 */
export async function ResolveOrganizationName(userId: string, organizationUid: string): Promise<string | undefined> {
    // Organizations disabled and resolution not available
    return undefined;
}
