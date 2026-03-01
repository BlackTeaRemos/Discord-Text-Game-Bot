import type { AutocompleteInteraction } from 'discord.js';
import { GetUserOrganizations } from '../../Flow/Object/Organization/View/GetUserOrganizations.js';
import { Log } from '../../Common/Log.js';

/** Log tag for this module */
const LOG_TAG = `AutocompleteOrganization`;

/** Maximum number of autocomplete suggestions returned to Discord */
const MAX_SUGGESTIONS = 25;

/**
 * Provide organization autocomplete suggestions filtered by partial name match
 *
 * @param interaction AutocompleteInteraction Discord autocomplete interaction
 * @param focusedOptionName string Name of the focused option defaulting to organization
 * @returns void
 *
 * @example
 * export async function autocomplete(interaction: AutocompleteInteraction) {
 *     await AutocompleteOrganization(interaction);
 * }
 */
export async function AutocompleteOrganization(
    interaction: AutocompleteInteraction,
    focusedOptionName: string = `organization`,
): Promise<void> {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name !== focusedOptionName) {
        await interaction.respond([]);
        return;
    }

    try {
        const userOrganizations = await GetUserOrganizations(interaction.user.id);
        const userInput = focusedOption.value.toLowerCase().trim();

        const filteredOrganizations = userOrganizations
            .filter(organization => {
                const matchesName = organization.name.toLowerCase().includes(userInput);
                const matchesFriendly = organization.friendlyName?.toLowerCase().includes(userInput) ?? false;
                const matchesUid = organization.uid.toLowerCase().includes(userInput);
                return matchesName || matchesFriendly || matchesUid;
            })
            .slice(0, MAX_SUGGESTIONS);

        const suggestions = filteredOrganizations.map(organization => ({
            name: organization.friendlyName ?? organization.name,
            value: organization.uid,
        }));

        await interaction.respond(suggestions);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Autocomplete failed: ${message}`, LOG_TAG);
        await interaction.respond([]);
    }
}
