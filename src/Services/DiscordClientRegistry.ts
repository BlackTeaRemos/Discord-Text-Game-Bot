import { Client } from 'discord.js';
import { Log } from '../Common/Log.js';

let _client: Client | null = null; // currently registered client instance

/**
 * Registers the active Discord client instance
 * @param client Client discord js client that has or soon will login
 */
export function RegisterDiscordClient(client: Client): void {
    // public API simple enough no JSDoc extras
    if (_client && _client !== client) {
        Log.warning(
            `RegisterDiscordClient called multiple times – overwriting previous client reference`,
            `DiscordClientRegistry`,
        );
    }
    _client = client;
}

/**
 * Returns the registered Discord client or null if not yet set
 * @returns Client or null active client instance
 */
export function GetDiscordClient(): Client | null {
    // public API
    return _client;
}
export const registerDiscordClient = RegisterDiscordClient;
