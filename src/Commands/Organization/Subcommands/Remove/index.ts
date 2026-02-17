import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import { log } from '../../../../Common/Log.js';
import { GetOrganizationByUid } from '../../../../Flow/Object/Organization/View/GetOrganizationByUid.js';
import { ResolveObjectByUid } from '../../../../Flow/Object/ResolveByUid.js';
import { RemoveObjectFromOrganization } from '../../../../Flow/Object/Organization/Association/RemoveObjectFromOrganization.js';
import type { CommandSubcommand } from '../../../CommandSubcommand.js';
import { Translate, TranslateFromContext } from '../../../../Services/I18nService.js';

const _subcommandName = `remove`; // subcommand name

export function BuildOrganizationRemoveSubcommand(
    subcommand: SlashCommandSubcommandBuilder,
): SlashCommandSubcommandBuilder {
    return subcommand
        .setName(_subcommandName)
        .setDescription(Translate(`commands.organization.remove.description`))
        .addStringOption(opt => {
            return opt.setName(`id`).setDescription(Translate(`commands.organization.remove.options.id`)).setAutocomplete(true).setRequired(true);
        })
        .addStringOption(opt => {
            return opt.setName(`object`).setDescription(Translate(`commands.organization.remove.options.object`)).setAutocomplete(true).setRequired(true);
        });
}

export async function ExecuteOrganizationRemoveSubcommand(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const organizationUidRaw = interaction.options.getString(`id`, true);
        const organizationUid = organizationUidRaw.trim();
        const objectUid = interaction.options.getString(`object`, true).trim();

        const organization = await GetOrganizationByUid(organizationUid);
        if (!organization) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.remove.errors.organizationNotFound`, {
                    params: { id: organizationUid },
                }),
            });
            return;
        }

        const resolved = await ResolveObjectByUid(objectUid);
        if (!resolved) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.remove.errors.objectNotFound`, {
                    params: { id: objectUid },
                }),
            });
            return;
        }

        const result = await RemoveObjectFromOrganization(objectUid, organizationUid);
        if (!result.success) {
            const reason = result.error
                ?? TranslateFromContext(interaction.executionContext, `commands.organization.remove.errors.unknownError`);
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.remove.errors.failed`, {
                    params: { reason },
                }),
            });
            return;
        }

        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.remove.messages.success`, {
                params: { name: resolved.name, uid: resolved.uid, organizationUid },
            }),
        });
        log.info(`Object removed from organization via command`, `OrganizationRemoveSubcommand`, `object=${objectUid} org=${organizationUid} by=${interaction.user.id}`);
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Organization remove subcommand failed`, message, `OrganizationRemoveSubcommand`);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.remove.errors.failed`, {
                params: { reason: message },
            }),
        });
    } finally {
        // no-op
    }
}

export const OrganizationRemoveSubcommand: CommandSubcommand = {
    subcommandName: _subcommandName,
    BuildSubcommand: BuildOrganizationRemoveSubcommand,
    Execute: ExecuteOrganizationRemoveSubcommand,
};
