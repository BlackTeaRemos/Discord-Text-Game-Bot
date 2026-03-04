import { Client, GatewayIntentBits } from 'discord.js';
import type { Interaction } from 'discord.js';
import { Log } from '../Common/Log.js';
import type { ConfigService } from '../Services/ConfigService.js';
import { CreateInteractionHandler } from './InteractionHandler.js';
import { CreateAutocompleteHandler } from './AutocompleteHandler.js';
import { CreateSafeEventListener } from '../Common/SafeEventListener.js';
import type { MainEventBus } from '../Events/MainEventBus.js';
import { EVENT_NAMES } from '../Domain/index.js';
import { LoadGrantsForGuild } from '../Common/Permission/Store.js';
import { InitI18n } from '../Services/I18nService.js';
import { executeWithTimeout } from '../Common/Timeout/index.js';

/**
 * Load cached permission grants for all guilds
 * @param client Client Discord client instance
 * @returns void Resolves after grants are loaded
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
        Log.info(`Loaded permission grants for ${loadedGuilds} guilds`, `Boot`);
    } catch(error) {
        Log.error(`Failed to load permission grants: ${String(error)}`, `Boot`);
    } finally {
        if (guilds.size === 0) {
            Log.info(`No guilds available for permission grant load`, `Boot`);
        }
    }
}



/**
 * Boot helper that loads config and logs in a Discord client and registers application commands
 */
export async function BootDiscordClient(options: {
    eventBus: MainEventBus;
    configService: ConfigService;
    loadedCommands: Record<string, any>;
    commandsReady: Promise<void>;
}): Promise<{ client: Client; config: any }> {
    const { eventBus, configService, loadedCommands, commandsReady } = options;

    const configPath = process.env.CONFIG_PATH || `./config/config.json`;
    const config = await configService.Load(configPath);
    await InitI18n({
        defaultLocale: config.defaultLocale,
        supportedLocales: config.supportedLocales,
    });

    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    });

    client.on(`error`, err => {
        Log.error(`Client error: ${err}`, `Boot`);
        eventBus.Emit(EVENT_NAMES.output, `Discord client error: ${String(err)}`);
    });

    // Command registration happens once the client is ready
    let didReady = false;


    const handleReady = CreateSafeEventListener(
        async() => {
            if (didReady) {
                return;
            }
            didReady = true;
            eventBus.Emit(EVENT_NAMES.output, `[Boot] Client ready, registering commands...`);
            try {
                await commandsReady;

                const commandData: any[] = [];
                const commandErrors: Array<{ key: string; error: string }> = [];
                for (const [key, cmd] of Object.entries(loadedCommands)) {
                    try {
                        const json = (cmd as any).data.toJSON();
                        commandData.push(json);
                        eventBus.Emit(EVENT_NAMES.output, `Prepared command: ${json.name} (key: ${key})`);
                    } catch(err) {
                        const msg = `Failed to convert command '${key}' to JSON: ${String(err)}`;
                        eventBus.Emit(EVENT_NAMES.output, msg);
                        commandErrors.push({ key: String(key), error: String(err) });
                    }
                }

                try {
                    eventBus.Emit(EVENT_NAMES.output, `Clearing global application commands at startup...`);
                    await executeWithTimeout(client.application!.commands.set([]), 30000, `clear global commands`);
                    eventBus.Emit(EVENT_NAMES.output, `Cleared global application commands at startup.`);
                } catch(err) {
                    eventBus.Emit(EVENT_NAMES.output, `Failed to clear global commands: ${String(err)}`);
                }

                try {
                    const guilds = Array.from(client.guilds.cache.values());
                    eventBus.Emit(EVENT_NAMES.output, `Clearing guild commands for ${guilds.length} guild(s)...`);
                    for (const g of guilds) {
                        try {
                            eventBus.Emit(EVENT_NAMES.output, `Clearing guild commands for guild ${g.id}...`);
                            await executeWithTimeout(client.application!.commands.set([], g.id), 20000, `clear guild ${g.id} commands`);
                            eventBus.Emit(EVENT_NAMES.output, `Cleared guild commands for guild ${g.id}.`);
                        } catch(err) {
                            eventBus.Emit(EVENT_NAMES.output, `Failed to clear guild commands for ${g.id}: ${String(err)}`);
                        }
                    }
                } catch(err) {
                    eventBus.Emit(EVENT_NAMES.output, `Failed while clearing guild commands: ${String(err)}`);
                }

                try {
                    try {
                        eventBus.Emit(EVENT_NAMES.output, `Registration payload: ${JSON.stringify(commandData, null, 2)}`);
                    } catch {}

                    const guilds = Array.from(client.guilds.cache.values());
                    eventBus.Emit(EVENT_NAMES.output, `Registering ${commandData.length} command(s) to ${guilds.length} guild(s): ${commandData.map(c => {
                        return c.name;
                    }).join(`, `)}`);

                    for (const guild of guilds) {
                        try {
                            const registeredGuild = await executeWithTimeout(
                                client.application!.commands.set(commandData, guild.id),
                                30000,
                                `register ${commandData.length} commands for guild ${guild.id}`,
                            );
                            eventBus.Emit(EVENT_NAMES.output, `Registered ${(registeredGuild as any).size ?? commandData.length} commands for guild ${guild.id} (${guild.name}).`);
                        } catch(guildErr) {
                            eventBus.Emit(EVENT_NAMES.output, `Failed to register commands for guild ${guild.id}: ${String(guildErr)}`);
                        }
                    }

                    if (guilds.length > 0) {
                        try {
                            const firstGuild = guilds[0];
                            const fetched = await executeWithTimeout(
                                client.application!.commands.fetch({ guildId: firstGuild.id }),
                                30000,
                                `fetch registered commands for guild ${firstGuild.id}`,
                            );
                            eventBus.Emit(EVENT_NAMES.output, `Fetched ${(fetched as any).size} registered commands for guild ${firstGuild.id}: ${Array.from((fetched as any).values()).map((c: any) => {
                                return c.name;
                            }).join(`, `)}`);
                        } catch(err) {
                            eventBus.Emit(EVENT_NAMES.output, `Failed to fetch registered commands: ${String(err)}`);
                        }
                    }
                } catch(err) {
                    eventBus.Emit(EVENT_NAMES.output, `Guild command registration failed: ${String(err)} - payload: ${JSON.stringify(commandData)}`);
                }

            } catch(error) {
                eventBus.Emit(EVENT_NAMES.output, `Ready handler failed: ${String(error)}`);
            } finally {
                await __LoadPermissionGrants(client);
            }
        },
        {
            name: `discord:clientReady`,
            onError: error => {
                eventBus.Emit(EVENT_NAMES.output, `Command registration failed in ready handler: ${String(error)}`);
            },
        },
    );

    eventBus.Once(EVENT_NAMES.discordReady, handleReady);

    await client.login(config.discordToken);

    eventBus.Emit(EVENT_NAMES.output, `Discord.js client logged in.`);

    const interactionHandler = CreateInteractionHandler({ loadedCommands });
    eventBus.On(EVENT_NAMES.discordInteraction, CreateSafeEventListener(
        async (interaction: Interaction) => {
            if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) {
                return;
            }
            await interactionHandler(interaction);
        },
        {
            name: `discord:chatInputCommand`,
            onError: error => {
                Log.error(`Chat input or message command handler failed: ${String(error)}`, `Boot`);
            },
        },
    ));

    const autocompleteHandler = CreateAutocompleteHandler({ loadedCommands });
    eventBus.On(EVENT_NAMES.discordInteraction, CreateSafeEventListener(
        async (interaction: Interaction) => {
            if (!interaction.isAutocomplete()) {
                return;
            }
            await autocompleteHandler(interaction);
        },
        {
            name: `discord:autocomplete`,
            onError: error => {
                Log.error(`Autocomplete handler failed: ${String(error)}`, `Boot`);
            },
        },
    ));

    // ensure we return the client and config as before
    return { client, config };
}
