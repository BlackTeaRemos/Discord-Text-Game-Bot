import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { GetCachedConfig } from '../Services/ConfigCache.js';
import { SetUserLocale, GetUserLocale } from '../Flow/Object/User/Locale.js';
import type { InteractionExecutionContextCarrier } from '../Common/Type/Interaction.js';

export const data = new SlashCommandBuilder()
    .setName(`user`)
    .setDescription(`Manage user settings`)
    .addSubcommand(sub => {
        return sub
            .setName(`config`)
            .setDescription(`Set or get a user configuration value`)
            .addStringOption(option => {
                return option
                    .setName(`option`)
                    .setDescription(`Configuration key to modify`)
                    // known options as choices for convenience
                    .addChoices({ name: `Preferred language`, value: `preferred_locale` })
                    .setRequired(true);
            },
            )
            .addStringOption(option => {
                return option.setName(`value`).setDescription(`Value to set (omit to view)`);
            });
    },
    );

export const permissionTokens = [[`user`]];

function normalizeLocale(input: string): string {
    return input.trim();
}

function isKnownOption(key: string): boolean {
    return key === `preferred_locale`;
}

/**
 * Validate value for an option. Return null on success or error message on failure.
 */
export async function ValidateOptionValue(option: string, value: string): Promise<string | null> {
    if (option === `preferred_locale`) {
        const cfg = await GetCachedConfig();
        const supported = cfg.supportedLocales ?? [`en`];
        const normalized = normalizeLocale(value);
        if (!supported.includes(normalized)) {
            return `Unsupported locale. Supported: ${supported.join(`, `)}`;
        }
        return null;
    }
    return `Unknown option '${option}'`;
}

export async function execute(interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>): Promise<void> {
    const sub = interaction.options.getSubcommand(true);
    if (sub !== `config`) {
        await interaction.reply({ content: `Subcommand not implemented.`, ephemeral: true });
        return;
    }

    const option = interaction.options.getString(`option`, true);
    const value = interaction.options.getString(`value`, false);

    if (!isKnownOption(option)) {
        await interaction.reply({ content: `Unknown configuration option.`, ephemeral: true });
        return;
    }

    const discordId = interaction.user.id;

    if (!value) {
        // read current value
        if (option === `preferred_locale`) {
            const current = await GetUserLocale(discordId);
            await interaction.reply({ content: `Current preferred locale: ${current ?? `not set`}`, ephemeral: true });
            return;
        }
        await interaction.reply({ content: `No value and no reader for ${option}.`, ephemeral: true });
        return;
    }

    const validationError = await ValidateOptionValue(option, value);
    if (validationError) {
        await interaction.reply({ content: `Invalid value: ${validationError}`, ephemeral: true });
        return;
    }

    // apply
    if (option === `preferred_locale`) {
        const normalized = normalizeLocale(value);
        await SetUserLocale(discordId, normalized);
        await interaction.reply({ content: `Preferred locale set to ${normalized}`, ephemeral: true });
        return;
    }

    await interaction.reply({ content: `Option handler missing for ${option}`, ephemeral: true });
}
