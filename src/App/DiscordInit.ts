import type { Client } from 'discord.js';
import { DiscordService } from '../Discord.js';
import type { MainEventBus } from '../Events/MainEventBus.js';
import { EVENT_NAMES } from '../Domain/index.js';

export function InitDiscord(options: {
    eventBus: MainEventBus;
    client: Client;
    config: any;
    setCmdChannelId?: (id: string | null) => void;
}) {
    const { eventBus, client, config, setCmdChannelId } = options;

    if (!config.discordToken || !config.discordGuildId || !config.discordCategoryId) {
        eventBus.Emit(EVENT_NAMES.output, `Missing discordToken, discordGuildId, or discordCategoryId in config.`);
        return null;
    }

    const discord = new DiscordService(client, config.discordGuildId, config.discordCategoryId, config.discordToken);

    eventBus.On(EVENT_NAMES.discordReady, async (_client, _category, channels) => {
        for (const ch of channels) {
            if (ch.name.startsWith(`cmd-`) && setCmdChannelId) {
                setCmdChannelId(ch.id);
            }
        }
    });

    eventBus.On(EVENT_NAMES.discordError, err => {
        eventBus.Emit(EVENT_NAMES.output, `Discord error: ${err}`);
    });

    return discord;
}
