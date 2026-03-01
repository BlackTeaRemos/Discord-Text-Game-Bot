import type { AutocompleteInteraction } from 'discord.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { GameObjectTemplateRepository } from '../../Repository/GameObject/GameObjectTemplateRepository.js';
import { Log } from '../../Common/Log.js';

/** Log tag for this module */
const LOG_TAG = `AutocompleteTemplateName`;

/** Maximum number of autocomplete suggestions returned to Discord */
const MAX_SUGGESTIONS = 25; // discord API limit

/**
 * @brief Provides template name autocomplete suggestions for the focused option by resolving the server game and filtering templates
 *
 * @param interaction AutocompleteInteraction Discord autocomplete interaction
 * @returns void Resolves after responding with suggestions
 * @example export { AutocompleteTemplateName as autocomplete } from './AutocompleteTemplateName.js';
 */
export async function AutocompleteTemplateName(interaction: AutocompleteInteraction): Promise<void> {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name !== `template`) {
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

        const templateRepository = new GameObjectTemplateRepository();
        const templates = await templateRepository.ListByGame(game.uid);

        const userInput = focusedOption.value.toLowerCase().trim(); // partial input from user

        const filteredTemplates = templates
            .filter(template => {
                return template.name.toLowerCase().includes(userInput);
            })
            .slice(0, MAX_SUGGESTIONS);

        const suggestions = filteredTemplates.map(template => {
            return {
                name: template.name,
                value: template.name,
            };
        });

        await interaction.respond(suggestions);
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Autocomplete failed: ${message}`, LOG_TAG);
        await interaction.respond([]);
    }
}
