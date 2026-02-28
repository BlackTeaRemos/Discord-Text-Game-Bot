import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { GetCachedConfig } from '../Services/ConfigCache.js';
import { SetUserLocale, GetUserLocale } from '../Flow/Object/User/Locale.js';
import type { InteractionExecutionContextCarrier } from '../Common/Type/Interaction.js';
import { Translate, TranslateFromContext } from '../Services/I18nService.js';

export const data = new SlashCommandBuilder()
    .setName(`user`)
    .setDescription(Translate(`commands.user.description`))
    .addSubcommand(sub => {
        return sub
            .setName(`config`)
            .setDescription(Translate(`commands.user.config.description`))
            .addStringOption(option => {
                return option
                    .setName(`option`)
                    .setDescription(Translate(`commands.user.config.option.description`))
                    // known options as choices for convenience
                    .addChoices({ name: Translate(`commands.user.config.option.choice.preferredLanguage`), value: `preferred_locale` })
                    .setRequired(true);
            },
            )
            .addStringOption(option => {
                return option.setName(`value`).setDescription(Translate(`commands.user.config.value.description`));
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
 * @brief Validates a value for an option returning null on success or an error message on failure
 */
export async function ValidateOptionValue(option: string, value: string): Promise<string | null> {
    try {
        if (option === `preferred_locale`) {
            const cfg = await GetCachedConfig();
            const supported = cfg.supportedLocales ?? [`en`];
            const normalized = normalizeLocale(value);
            if (!supported.includes(normalized)) {
                return Translate(`commands.user.errors.unsupportedLocale`, {
                    params: { supported: supported.join(`, `) },
                });
            }
            return null;
        }
        return Translate(`commands.user.errors.unknownOptionValue`, { params: { option } });
    } catch(error) {
        void error;
        return Translate(`commands.user.errors.validationFailed`);
    } finally {
        // no op
    }
}

export async function execute(interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>): Promise<void> {
    try {
        const sub = interaction.options.getSubcommand(true);
        if (sub !== `config`) {
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.user.errors.subcommandNotImplemented`),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const option = interaction.options.getString(`option`, true);
        const value = interaction.options.getString(`value`, false);

        if (!isKnownOption(option)) {
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.user.errors.unknownOption`),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const discordId = interaction.user.id;

        if (!value) {
            if (option === `preferred_locale`) {
                const current = await GetUserLocale(discordId);
                const content = current
                    ? TranslateFromContext(interaction.executionContext, `commands.user.messages.currentLocale`, { params: { locale: current } })
                    : TranslateFromContext(interaction.executionContext, `commands.user.messages.currentLocaleUnset`);
                await interaction.reply({ content, flags: MessageFlags.Ephemeral });
                return;
            }
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.user.errors.noValueReader`, { params: { option } }),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const validationError = await ValidateOptionValue(option, value);
        if (validationError) {
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.user.errors.invalidValue`, { params: { reason: validationError } }),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (option === `preferred_locale`) {
            const normalized = normalizeLocale(value);
            await SetUserLocale(discordId, normalized);
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.user.messages.localeSet`, { params: { locale: normalized } }),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.user.errors.optionHandlerMissing`, { params: { option } }),
            flags: MessageFlags.Ephemeral,
        });
    } catch(error) {
        void error;
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.user.errors.unexpected`),
            flags: MessageFlags.Ephemeral,
        });
    } finally {
        // no op
    }
}
