import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { GetOrganizationSelection } from '../../Flow/Command/Description/GetUserOrganizations.js';

/**
 * States returned when preparing an organization selection prompt.
 * @example const status: OrganizationPromptStatus = 'prompt';
 */
export type OrganizationPromptStatus = `empty` | `auto` | `prompt`;

/**
 * Options accepted when building an organization selection prompt.
 * @property userId string Discord user id requesting selection. @example '123456789012345678'
 * @property customId string Custom id attached to the select menu. @example 'select_org'
 * @property placeholder string | undefined Placeholder shown on the select. @example 'Select organization'
 * @property promptMessage string | undefined Message displayed when prompting the user. @example 'Choose organization to continue.'
 * @property emptyMessage string | undefined Message returned when user has no organizations. @example 'No organizations available.'
 * @property limit number | undefined Maximum number of organizations to surface (1-25). @example 10
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
 * Result describing how the caller should proceed after preparing the prompt.
 * @property status OrganizationPromptStatus Indicates whether to prompt, auto-select, or abort. @example 'prompt'
 * @property selection Awaited<ReturnType<typeof GetOrganizationSelection>> Raw selection metadata for reuse. @example result.selection.orgs
 * @property components ActionRowBuilder<StringSelectMenuBuilder>[] | undefined Select menu rows returned when prompting. @example result.components[0]
 * @property message string | undefined Suggested message to display. @example 'Select organization to continue.'
 * @property organization { uid: string; name: string } | undefined Auto-selected organization details. @example { uid: 'org1', name: 'Acme' }
 */
export interface OrganizationPromptResult {
    status: OrganizationPromptStatus;
    selection: Awaited<ReturnType<typeof GetOrganizationSelection>>;
    components?: ActionRowBuilder<StringSelectMenuBuilder>[];
    message?: string;
    organization?: { uid: string; name: string };
}

/**
 * Prepare an organization selection prompt, handling empty and auto-select cases.
 * @param options OrganizationPromptOptions Configuration describing the prompt. @example await PrepareOrganizationPrompt({ userId, customId: 'select', placeholder: 'Select org' });
 * @returns Promise<OrganizationPromptResult> Result instructing caller whether to prompt or auto-select. @example const prompt = await PrepareOrganizationPrompt(opts);
 */
export async function PrepareOrganizationPrompt(options: OrganizationPromptOptions): Promise<OrganizationPromptResult> {
    const limit = Math.min(Math.max(options.limit ?? 25, 1), 25);
    const selection = await GetOrganizationSelection(options.userId);
    if (selection.orgs.length === 0) {
        return {
            status: `empty`,
            selection,
            message: options.emptyMessage ?? `You are not assigned to any organization.`,
        };
    }
    if (selection.selected && selection.orgUid && selection.orgName) {
        return {
            status: `auto`,
            selection,
            organization: { uid: selection.orgUid, name: selection.orgName },
        };
    }
    const menu = new StringSelectMenuBuilder()
        .setCustomId(options.customId)
        .setPlaceholder(options.placeholder ?? `Select organization`)
        .addOptions(
            selection.orgs.slice(0, limit).map((org): { label: string; value: string } => {
                return {
                    label: org.name.slice(0, 100),
                    value: org.uid,
                };
            }),
        );
    return {
        status: `prompt`,
        selection,
        message: options.promptMessage ?? `Select organization to continue.`,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    };
}

/**
 * Resolve a human-friendly organization name for the supplied organization uid.
 * @param userId string Discord user id owning the organizations. @example '123456789012345678'
 * @param organizationUid string Organization uid to resolve. @example 'org_1'
 * @returns Promise<string | undefined> Resolved name or undefined when not found. @example const name = await ResolveOrganizationName(userId, orgUid);
 */
export async function ResolveOrganizationName(userId: string, organizationUid: string): Promise<string | undefined> {
    const selection = await GetOrganizationSelection(userId);
    const match = selection.orgs.find((org): boolean => {
        return org.uid === organizationUid;
    });
    return match?.name;
}
