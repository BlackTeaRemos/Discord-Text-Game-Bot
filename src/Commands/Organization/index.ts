import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { log } from '../../Common/Log.js';
import { BuildCommandSubcommandIndex, LoadCommandSubcommands } from '../CommandSubcommand.js';
import type { CommandBuilder } from '../CommandSubcommand.js';
import { Translate, TranslateFromContext } from '../../Services/I18nService.js';

const _filePath = fileURLToPath(import.meta.url); // module file path
const _dirPath = dirname(_filePath); // module directory path
const _subcommandsRootPath = resolve(_dirPath, `Subcommands`); // subcommands directory path

const _organizationSubcommands = await LoadCommandSubcommands(_subcommandsRootPath); // discovered subcommand modules
const _organizationSubcommandIndex = BuildCommandSubcommandIndex(_organizationSubcommands); // grouped subcommand index

export const data = (() => {
    let builder: CommandBuilder = new SlashCommandBuilder()
        .setName(`organization`)
        .setDescription(Translate(`commands.organization.description`));

    for (const subcommand of _organizationSubcommandIndex.ungrouped.values()) {
        builder = builder.addSubcommand(sub => {
            return subcommand.BuildSubcommand(sub);
        });
    }

    const groupNames = Array.from(_organizationSubcommandIndex.grouped.keys()).sort();
    for (const groupName of groupNames) {
        const groupMap = _organizationSubcommandIndex.grouped.get(groupName);
        if (!groupMap) {
            continue;
        }

        const description = _organizationSubcommandIndex.groupDescriptions.get(groupName)
            ?? Translate(`commands.organization.group.defaultDescription`, { params: { groupName } });
        builder = builder.addSubcommandGroup(group => {
            group.setName(groupName).setDescription(description);

            for (const subcommand of groupMap.values()) {
                group.addSubcommand(sub => {
                    return subcommand.BuildSubcommand(sub);
                });
            }

            return group;
        });
    }

    return builder;
})();

export const permissionTokens: TokenSegmentInput[][] = [[`organization`]];

/**
 * Route /organization subcommands to respective handlers.
 * @param interaction Discord interaction instance.
 * @returns Promise<void> Resolves when handler completes.
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    try {
        const group = interaction.options.getSubcommandGroup(false);
        if (group) {
            const groupMap = _organizationSubcommandIndex.grouped.get(group.toLowerCase());
            const groupedSubcommand = groupMap?.get(subcommand.toLowerCase());
            if (groupedSubcommand) {
                await groupedSubcommand.Execute(interaction);
                return;
            }
        }

        const resolvedSubcommand = _organizationSubcommandIndex.ungrouped.get(subcommand.toLowerCase());
        if (resolvedSubcommand) {
            await resolvedSubcommand.Execute(interaction);
            return;
        }

        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.errors.unknownSubcommand`, {
                params: { subcommand },
            }),
            flags: MessageFlags.Ephemeral,
        });
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Organization command failed`, message, `OrganizationCommand`);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.errors.commandFailed`, {
                    params: { message },
                }),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.errors.commandFailed`, {
                params: { message },
            }),
        });
    } finally {
        // no-op
    }
}
