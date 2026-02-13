import { EventEmitter } from 'events';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { log } from '../Common/Log.js';
import type { ConfigService } from '../Services/ConfigService.js';
import { CreateInteractionHandler } from './InteractionHandler.js';
import { CreateAutocompleteHandler } from './AutocompleteHandler.js';
import { InitializeHandlers } from './Handler/Loader.js';
import { CreateSafeEventListener } from '../Common/SafeEventListener.js';
import { LoadGrantsForGuild } from '../Common/Permission/store.js';
import { InitI18n } from '../Services/I18nService.js';
import { executeWithTimeout } from '../Common/Timeout/index.js';

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
    } catch(error) {
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
    onInteractionCreate?: Function;
    onMessageCreate?: Function;
}): Promise<{ client: Client; config: any }> {
    const { eventBus, configService, loadedCommands, commandsReady, onInteractionCreate, onMessageCreate } = options;

    const configPath = process.env.CONFIG_PATH || `./config/config.json`;
    const config = await configService.Load(configPath);
    await InitI18n({
        defaultLocale: config.defaultLocale,
        supportedLocales: config.supportedLocales,
    });

    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    });

    InitializeHandlers(client, { onInteractionCreate, onMessageCreate });

    // Error logging
    client.on(`error`, err => {
        log.error(`Client error: ${err}`, `Boot`);
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

                const commandData: any[] = [];
                const commandErrors: Array<{ key: string; error: string }> = [];
                for (const [key, cmd] of Object.entries(loadedCommands)) {
                    try {
                        const json = (cmd as any).data.toJSON();
                        commandData.push(json);
                        eventBus.emit(`output`, `Prepared command: ${json.name} (key: ${key})`);
                    } catch(err) {
                        const msg = `Failed to convert command '${key}' to JSON: ${String(err)}`;
                        eventBus.emit(`output`, msg);
                        commandErrors.push({ key: String(key), error: String(err) });
                    }
                }

                try {
                    // Clear global commands
                    eventBus.emit(`output`, `Clearing global application commands at startup...`);
                    await executeWithTimeout(client.application!.commands.set([]), 30000, `clear global commands`);
                    eventBus.emit(`output`, `Cleared global application commands at startup.`);
                } catch(err) {
                    eventBus.emit(`output`, `Failed to clear global commands: ${String(err)}`);
                }

                try {
                    const guilds = Array.from(client.guilds.cache.values());
                    eventBus.emit(`output`, `Clearing guild commands for ${guilds.length} guild(s)...`);
                    for (const g of guilds) {
                        try {
                            eventBus.emit(`output`, `Clearing guild commands for guild ${g.id}...`);
                            await executeWithTimeout(client.application!.commands.set([], g.id), 20000, `clear guild ${g.id} commands`);
                            eventBus.emit(`output`, `Cleared guild commands for guild ${g.id}.`);
                        } catch(err) {
                            eventBus.emit(`output`, `Failed to clear guild commands for ${g.id}: ${String(err)}`);
                        }
                    }
                } catch(err) {
                    eventBus.emit(`output`, `Failed while clearing guild commands: ${String(err)}`);
                }

                try {
                    try {
                        eventBus.emit(`output`, `Registration payload: ${JSON.stringify(commandData, null, 2)}`);
                    } catch {}

                    // Register commands per-guild for instant propagation.
                    // Global commands can take up to 1 hour to propagate across Discord's CDN.
                    const guilds = Array.from(client.guilds.cache.values());
                    eventBus.emit(`output`, `Registering ${commandData.length} command(s) to ${guilds.length} guild(s): ${commandData.map(c => {
                        return c.name;
                    }).join(`, `)}`);

                    for (const guild of guilds) {
                        try {
                            const registeredGuild = await executeWithTimeout(
                                client.application!.commands.set(commandData, guild.id),
                                30000,
                                `register ${commandData.length} commands for guild ${guild.id}`,
                            );
                            eventBus.emit(`output`, `Registered ${(registeredGuild as any).size ?? commandData.length} commands for guild ${guild.id} (${guild.name}).`);
                        } catch(guildErr) {
                            eventBus.emit(`output`, `Failed to register commands for guild ${guild.id}: ${String(guildErr)}`);
                        }
                    }

                    // Verify registration on first guild
                    if (guilds.length > 0) {
                        try {
                            const firstGuild = guilds[0];
                            const fetched = await executeWithTimeout(
                                client.application!.commands.fetch({ guildId: firstGuild.id }),
                                30000,
                                `fetch registered commands for guild ${firstGuild.id}`,
                            );
                            eventBus.emit(`output`, `Fetched ${(fetched as any).size} registered commands for guild ${firstGuild.id}: ${Array.from((fetched as any).values()).map((c: any) => {
                                return c.name;
                            }).join(`, `)}`);
                        } catch(err) {
                            eventBus.emit(`output`, `Failed to fetch registered commands: ${String(err)}`);
                        }
                    }
                } catch(err) {
                    eventBus.emit(`output`, `Guild command registration failed: ${String(err)} - payload: ${JSON.stringify(commandData)}`);
                }

            } catch(error) {
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
                    log.error(`Chat input or message command handler failed: ${String(error)}`, `Boot`);
                },
            },
        ) as any,
    );

    // Autocomplete handler for slash command option suggestions
    const autocompleteHandler = CreateAutocompleteHandler({ loadedCommands });
    client.on(
        Events.InteractionCreate,
        CreateSafeEventListener(
            async interaction => {
                if (!interaction.isAutocomplete()) {
                    return;
                }
                await autocompleteHandler(interaction);
            },
            {
                name: `discord:autocomplete`,
                onError: error => {
                    log.error(`Autocomplete handler failed: ${String(error)}`, `Boot`);
                },
            },
        ) as any,
    );

    // ensure we return the client and config as before
    return { client, config };
}
