import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/types.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ExecuteGrantAll } from './GrantAll.js';
import { ExecuteListGrants } from './ListGrants.js';
import { ExecuteRevokeAll } from './RevokeAll.js';
import { Translate, TranslateFromContext, BuildLocalizations } from '../../Services/I18nService.js';

export const data = new SlashCommandBuilder()
    .setName(`permit`)
    .setDescription(Translate(`commands.permit.description`))
    .setDescriptionLocalizations(BuildLocalizations(`commands.permit.description`))
    .addSubcommand((subcommand) => {
        return subcommand
            .setName(`all`)
            .setDescription(Translate(`commands.permit.subcommands.all.description`))
            .setDescriptionLocalizations(BuildLocalizations(`commands.permit.subcommands.all.description`))
            .addUserOption((option) => {
                return option
                    .setName(`user`)
                    .setDescription(Translate(`commands.permit.options.user`))
                    .setRequired(true);
            });
    })
    .addSubcommand((subcommand) => {
        return subcommand
            .setName(`list`)
            .setDescription(Translate(`commands.permit.subcommands.list.description`))
            .setDescriptionLocalizations(BuildLocalizations(`commands.permit.subcommands.list.description`))
            .addUserOption((option) => {
                return option
                    .setName(`user`)
                    .setDescription(Translate(`commands.permit.options.user`))
                    .setRequired(true);
            });
    })
    .addSubcommand((subcommand) => {
        return subcommand
            .setName(`revoke`)
            .setDescription(Translate(`commands.permit.subcommands.revoke.description`))
            .setDescriptionLocalizations(BuildLocalizations(`commands.permit.subcommands.revoke.description`))
            .addUserOption((option) => {
                return option
                    .setName(`user`)
                    .setDescription(Translate(`commands.permit.options.user`))
                    .setRequired(true);
            });
    });

export const permissionTokens: TokenSegmentInput[][] = [[`permit`]];

/**
 * Route /permit subcommands to respective handlers.
 *
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction.
 * @returns Promise<void> Resolves when handler completes.
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case `all`:
            await ExecuteGrantAll(interaction);
            break;
        case `list`:
            await ExecuteListGrants(interaction);
            break;
        case `revoke`:
            await ExecuteRevokeAll(interaction);
            break;
        default:
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.permit.errors.unknownSubcommand`, {
                    params: { subcommand },
                }),
                flags: MessageFlags.Ephemeral,
            });
    }
}
