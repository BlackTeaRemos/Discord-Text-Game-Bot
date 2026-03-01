import type { AutocompleteInteraction } from 'discord.js';
import { Log } from '../Common/Log.js';
import { createExecutionContext } from '../Domain/index.js';

/** Log tag for this module */
const LOG_TAG = `AutocompleteHandler`;

/**
 * Factory for Discord autocomplete interaction handler
 *
 * @param options object Map of command modules keyed by command name
 * @returns function Handler function for autocomplete interactions
 * @example const handler = CreateAutocompleteHandler({ loadedCommands }); client.on('interactionCreate', handler);
 */
export function CreateAutocompleteHandler(options: { loadedCommands: Record<string, any> }) {
    const { loadedCommands } = options;

    /**
     * Handle an autocomplete interaction by delegating to the command module
     * @param interaction AutocompleteInteraction Discord autocomplete interaction
     * @returns void
     */
    return async function HandleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const command = loadedCommands[interaction.commandName];
        if (!command) {
            Log.warning(`No command module found for autocomplete: ${interaction.commandName}`, LOG_TAG);
            await interaction.respond([]);
            return;
        }

        if (typeof command.autocomplete !== `function`) {
            Log.debug(`Command "${interaction.commandName}" has no autocomplete handler`, LOG_TAG);
            await interaction.respond([]);
            return;
        }

        try {
            interaction.executionContext = createExecutionContext(interaction.id);
            await command.autocomplete(interaction);
        } catch(error) {
            const message = error instanceof Error ? error.message : String(error);
            Log.error(`Autocomplete failed for /${interaction.commandName}: ${message}`, LOG_TAG);
            try {
                await interaction.respond([]);
            } catch {
                // interaction may have expired
            }
        }
    };
}
