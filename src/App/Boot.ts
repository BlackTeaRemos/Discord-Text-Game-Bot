import { EventEmitter } from 'events';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { log } from '../Common/Log.js';
import type { ConfigService } from '../Services/ConfigService.js';
import { CreateInteractionHandler } from './InteractionHandler.js';
import { CreateSafeEventListener } from '../Common/SafeEventListener.js';
import { LoadGrantsForGuild } from '../Common/Permission/Store.js';

/**
 * Load cached permission grants for all guilds
 * @param client Client Discord client instance example client
 * @returns Promise<void> Resolves after grants are loaded example void
 * @example await __LoadPermissionGrants(client)
 */
async function __LoadPermissionGrants(client: Client): Promise<void> {
    const guilds = client.guilds.cache; // cached guild collection

    try {
        let loadedGuilds = 0; // number of guilds loaded
        for (const [guildId] of guilds) {
            await LoadGrantsForGuild(guildId);
            loadedGuilds += 1;
        }
        log.info(`Loaded permission grants for ${loadedGuilds} guilds`, `Boot`);
    } catch (error) {
        log.error(`Failed to load permission grants: ${String(error)}`, `Boot`);
    } finally {
        if (guilds.size === 0) {
            log.info(`No guilds available for permission grant load`, `Boot`);
        }
    }
}

/**
 * Boot helper: loads config, creates and logs-in a Discord client, and registers application commands.
 * This extracts the large boot logic from the main application class.
 */
export async function bootDiscordClient(options: {
    eventBus: EventEmitter;
    configService: ConfigService;
    loadedCommands: Record<string, any>;
    commandsReady: Promise<void>;
    onInteractionCreate?: (any: any) => void;
    onMessageCreate?: (any: any) => void;
}): Promise<{ client: Client; config: any }> {
    const { eventBus, configService, loadedCommands, commandsReady, onInteractionCreate, onMessageCreate } = options;

    const configPath = process.env.CONFIG_PATH || `./config/config.json`;
    const config = await configService.Load(configPath);

    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    });

    // Wire lightweight handlers provided by the caller
    if (onInteractionCreate) {
        client.on(
            `interactionCreate`,
            CreateSafeEventListener(onInteractionCreate as any, {
                name: `discord:interactionCreate`,
                onError: (error, name) => {
                    try {
                        log.error(`${name ?? `discord:interactionCreate`} listener error: ${String(error)}`, `Boot`);
                    } catch {}
                },
            }) as any,
        );
    }
    if (onMessageCreate) {
        client.on(
            `messageCreate`,
            CreateSafeEventListener(onMessageCreate as any, {
                name: `discord:messageCreate`,
                onError: (error, name) => {
                    try {
                        log.error(`${name ?? `discord:messageCreate`} listener error: ${String(error)}`, `Boot`);
                    } catch {}
                },
            }) as any,
        );
    }

    // Error logging
    client.on(`error`, err => {
        try {
            log.error(`Client error: ${err}`, `Boot`);
        } catch {
            // swallow
        }
        eventBus.emit(`output`, `Discord client error: ${String(err)}`);
    });

    // Command registration happens once the client is ready
    let didReady = false;
    const handleReady = CreateSafeEventListener(
        async() => {
            if (didReady) {
                return;
            }
            didReady = true;
            eventBus.emit(`output`, `[Boot] Client ready, registering commands...`);
            try {
                await commandsReady;

                // Wipe all commands first (global)
                await client.application!.commands.set([]);

                // Prepare command bodies
                const commandData = Object.values(loadedCommands).map((cmd: any) => {
                    return cmd.data.toJSON();
                });

                if (config.discordGuildId) {
                    try {
                        const registeredGuild = await client.application!.commands.set(commandData, config.discordGuildId);
                        eventBus.emit(
                            `output`,
                            `Registered ${registeredGuild.size ?? commandData.length} guild commands to guild ${config.discordGuildId}.`,
                        );
                    } catch (err) {
                        eventBus.emit(`output`, `Guild command registration failed: ${String(err)}`);
                    }
                } else {
                    try {
                        const registeredGlobal = await client.application!.commands.set(commandData);
                        eventBus.emit(
                            `output`,
                            `Registered ${registeredGlobal.size ?? commandData.length} global commands.`,
                        );
                    } catch (err) {
                        eventBus.emit(`output`, `Global command registration failed: ${String(err)}`);
                    }
                }

            } catch (error) {
                eventBus.emit(`output`, `Ready handler failed: ${String(error)}`);
            } finally {
                await __LoadPermissionGrants(client);
            }
        },
        {
            name: `discord:clientReady`,
            onError: error => {
                eventBus.emit(`output`, `Command registration failed in ready handler: ${String(error)}`);
            },
        },
    );

    client.once(Events.ClientReady, handleReady);

    await client.login(config.discordToken);

    eventBus.emit(`output`, `Discord.js client logged in.`);

    // Extracted interaction handler for clarity
    const interactionHandler = CreateInteractionHandler({ loadedCommands });
    client.on(
        Events.InteractionCreate,
            CreateSafeEventListener(
                async interaction => {
                    if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) {
                        return;
                    }
                    await interactionHandler(interaction);
                },
                {
                    name: `discord:chatInputCommand`,
                    onError: error => {
                        try {
                            log.error(`Chat input or message command handler failed: ${String(error)}`, `Boot`);
                        } catch {}
                    },
                },
            ) as any,
    );

    // ensure we return the client and config as before
    return { client, config };
}
