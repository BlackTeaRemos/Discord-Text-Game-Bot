import { Log } from './Common/Log.js';
import {
    Events,
    TextChannel,
    CategoryChannel,
    ChannelType,
    Guild,
    Message,
    Client,
    AttachmentBuilder,
} from 'discord.js';
import { MAIN_EVENT_BUS } from './Events/MainEventBus.js';
import { RegisterDiscordClient } from './Services/DiscordClientRegistry.js';

/**
 * @brief Service for managing Discord bot connections and channel operations
 * @example
 * const discordService = new DiscordService(client, '123456789', '987654321');
 */
export class DiscordService {
    public readonly client: Client; // DiscordJS client instance
    private _category: CategoryChannel | null = null; // Root category channel for object storage
    private _channels: TextChannel[] = []; // Text channels in the category
    private _guild: Guild | null = null; // Discord guild the bot is connected to

    /**
     * @brief Creates a new DiscordService and configures client event handlers
     * @param client DiscordJS Client instance
     * @param guildId Discord server guild ID to connect to
     * @param categoryId Category channel ID used as root for object storage
     * @param discordToken Discord bot token from configuration
     * @example
     * const discordService = new DiscordService(client, '123456789012345678', '876543210987654321', 'bot-token');
     */
    constructor(client: Client, guildId: string, categoryId: string, discordToken: string) {
        this.client = client;
        this.client.on(`raw`, (packet: any) => {
            // Raw event name in packet t and data in packet d
            // log.debug(`Raw event ${packet.t}: ${JSON.stringify(packet.d)}`, 'DiscordService');
        });
        // Listen for all error events
        this.client.on(`error`, err => {
            Log.error(
                `Client error event: ${err instanceof Error ? err.stack || err.message : String(err)}`,
                `DiscordService`,
            );
        });

        this.client.on(`shardError`, err => {
            Log.error(
                `Shard error event: ${err instanceof Error ? err.stack || err.message : String(err)}`,
                `DiscordService`,
            );
        });

        // DiscordJS debug events are silenced to reduce log noise in production

        this.client.on(`warn`, info => {
            Log.warning(`Warning: ${info}`, `DiscordService`);
        });

        this.client.once(Events.ClientReady, async () => {
            try {
                // Fetch the guild and log it
                const guild = await this.client.guilds.fetch(guildId);
                this._guild = guild;
                Log.info(`Connected to guild: ${guild.name} (${guild.id})`, `DiscordService`);

                // Fetch the category and log it
                const category = await this.client.channels.fetch(categoryId);

                if (!category || category.type !== ChannelType.GuildCategory) {
                    throw new Error(`Category not found or not a category`);
                }
                this._category = category as CategoryChannel;
                Log.info(`Using category: ${category.name} (${category.id})`, `DiscordService`);

                // Fetch all text channels in the category
                const allChannels = (category as CategoryChannel).children.cache.filter((ch: any) => {
                    return ch.type === ChannelType.GuildText;
                });
                this._channels = Array.from(allChannels.values()) as TextChannel[];
                Log.info(`Found ${this._channels.length} text channel(s) in category.`, `DiscordService`);
                this._channels.forEach(ch => {
                    return Log.info(`Channel: ${ch.name} (${ch.id})`, `DiscordService`);
                });

                // Check for any cmd channel and create one if missing
                let cmdChannel = this._channels.find(ch => {
                    return ch.name.startsWith(`cmd-`);
                });

                if (!cmdChannel) {
                    const uniqueName = `cmd-bot`;
                    Log.info(`No cmd- channel found, creating '${uniqueName}'...`, `DiscordService`);

                    try {
                        cmdChannel = await (category as CategoryChannel).guild.channels.create({
                            name: uniqueName,
                            type: ChannelType.GuildText,
                            parent: category.id,
                        });
                        this._channels.push(cmdChannel);
                        Log.info(`'${uniqueName}' channel created.`, `DiscordService`);
                    } catch (err) {
                        Log.error(
                            `Failed to create cmd- channel: ${err instanceof Error ? err.stack || err.message : String(err)}`,
                            `DiscordService`,
                        );
                    }
                }

                MAIN_EVENT_BUS.emit(`discord:ready`, this.client, this._category, this._channels);
            } catch (err) {
                Log.error(
                    `Error during ready event: ${err instanceof Error ? err.stack || err.message : String(err)}`,
                    `DiscordService`,
                );
                MAIN_EVENT_BUS.emit(`discord:error`, err);
            }
        });

        this.client.on(Events.MessageCreate, msg => {
            // Emit raw message events for downstream consumers
            // Individual listeners are responsible for ignoring irrelevant channels
            MAIN_EVENT_BUS.emit(`discord:message:raw`, msg);
        });

        Log.info(`Attempting to login...`, `DiscordService`);

        try {
            RegisterDiscordClient(this.client);
        } catch {
            /* ignore */
        }
    }

    /**
     * @brief Returns the DiscordJS client instance for direct API access
     * @returns Client DiscordJS client instance
     * @example
     * const client = discordService.GetClient();
     */
    public GetClient(): Client {
        return this.client;
    }

    /**
     * @brief Returns the Discord guild instance or null before ClientReady
     * @returns Guild instance or null if not yet loaded
     * @example
     * const guild = discordService.GetGuild();
     * if (guild) console.log(`Connected to ${guild.name}`);
     */
    public GetGuild(): Guild | null {
        return this._guild;
    }

    /**
     * @brief Returns the root category channel or null before ClientReady
     * @returns CategoryChannel instance or null if not yet loaded
     * @example
     * const category = discordService.GetCategory();
     */
    public GetCategory(): CategoryChannel | null {
        return this._category;
    }

    /**
     * @brief Returns all text channels in the configured category
     * @returns Array of TextChannel instances in the category
     * @example
     * const channels = discordService.GetChannels();
     * channels.forEach(ch => console.log(`Channel: ${ch.name}`));
     */
    public GetChannels(): TextChannel[] {
        return this._channels;
    }
}
