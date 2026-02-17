import type { AutocompleteInteraction } from 'discord.js';
import { GetUserOrganizations } from '../../Flow/Object/Organization/View/GetUserOrganizations.js';
import { log } from '../../Common/Log.js';

/** Log tag for this module */
const LOG_TAG = `AutocompleteOrganization`;

/** Maximum number of autocomplete suggestions returned to Discord */
const MAX_SUGGESTIONS = 25;

/**
 * Provide organization autocomplete suggestions for the focused option
 * Fetches organizations the user belongs to and filters by partial name match
 * Returns organization name as display with uid as value
 *
 * @param interaction AutocompleteInteraction Discord autocomplete interaction
 * @param focusedOptionName string Name of the focused option to handle, defaults to 'organization'
 * @returns Promise<void> Resolves after responding with suggestions
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
        log.error(`Autocomplete failed: ${message}`, LOG_TAG);
        await interaction.respond([]);
    }
}
