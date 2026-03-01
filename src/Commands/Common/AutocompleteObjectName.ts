import type { AutocompleteInteraction } from 'discord.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { GameObjectRepository } from '../../Repository/GameObject/GameObjectRepository.js';
import { Log } from '../../Common/Log.js';

/** Log tag for this module */
const LOG_TAG = `AutocompleteObjectName`;

/** Maximum number of autocomplete suggestions returned to Discord */
const MAX_SUGGESTIONS = 25;

/**
 * @brief Provides object name autocomplete suggestions for the focused option by resolving the server game and searching by name
 *
 * @param interaction AutocompleteInteraction Discord autocomplete interaction
 * @param focusedOptionName string Name of the focused option to handle defaulting to id
 * @returns void Resolves after responding with suggestions
 *
 * @example
 * export async function autocomplete(interaction: AutocompleteInteraction) {
 *     await AutocompleteObjectName(interaction);
 * }
 */
export async function AutocompleteObjectName(
    interaction: AutocompleteInteraction,
    focusedOptionName: string = `id`,
): Promise<void> {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name !== focusedOptionName) {
        await interaction.respond([]);
        return;
    }

    const serverId = interaction.guildId;
    if (!serverId) {
        await interaction.respond([]);
        return;
    }

    try {
        const games = await ListGamesForServer(serverId);
        const game = games[0];
        if (!game) {
            await interaction.respond([]);
            return;
        }

        const objectRepository = new GameObjectRepository();
        const userInput = focusedOption.value.trim();

        // When input is empty show recent objects otherwise search by name
        const matchingObjects = userInput.length > 0
            ? await objectRepository.SearchByName(game.uid, userInput, MAX_SUGGESTIONS)
            : await objectRepository.ListByGame(game.uid);

        const suggestions = matchingObjects
            .slice(0, MAX_SUGGESTIONS)
            .map(gameObject => ({
                name: gameObject.name,
                value: gameObject.uid,
            }));

        await interaction.respond(suggestions);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Autocomplete failed: ${message}`, LOG_TAG);
        await interaction.respond([]);
    }
}
