import { ChannelType, type Client } from 'discord.js';
import { log } from '../Common/Log.js';
import { commands, commandsReady } from '../Commands/index.js';
import { LoadGrantsForGuild } from '../Common/Permission/Store.js';

/**
 * @brief Handles the ready event by logging bot readiness and listing commands then ensuring required channels exist
 * @param client Client The Discord client instance
 * @returns void Resolves when setup is complete
 */
export async function OnReady(client: Client): Promise<void> {
    log.info(`Bot is ready as ${client.user?.tag}`, `Ready`);

    // Load permission grants for all guilds
    try {
        const guilds = client.guilds.cache;
        for (const [guildId] of guilds) {
            await LoadGrantsForGuild(guildId);
        }
        log.info(`Loaded permission grants for ${guilds.size} guilds`, `Ready`);
    } catch(error) {
        log.error(`Failed to load permission grants: ${(error as Error).message}`, `Ready`);
    }

    // Diagnostic listing registered application commands for global and guild
    try {
        const application = client.application;

        if (application?.commands) {
            // Fetch existing global commands
            const global = await application.commands.fetch();
            log.info(
                `Global commands (${global.size}): ${[...global.values()]
                    .map(c => {
                        return `/${c.name}`;
                    })
                    .join(`, `)}`,
                `Ready`,
            );
            // Ensure command loader has completed since registration is handled centrally in Boot
            try {
                await commandsReady;
                log.info(`Command loader ready; skipping automatic global registration in Ready handler.`, `Ready`);
            } catch(err) {
                log.error(
                    `Command loader readiness check failed`,
                    err instanceof Error ? err.message : String(err),
                    `Ready`,
                );
            }
        }
    } catch(err) {
        log.warning(`Failed to fetch global commands: ${err instanceof Error ? err.message : String(err)}`, `Ready`);
    }
}
