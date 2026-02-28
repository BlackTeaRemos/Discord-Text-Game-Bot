import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../../Common/Type/Interaction.js';
import { log } from '../../../../Common/Log.js';
import { GetOrganizationByUid } from '../../../../Flow/Object/Organization/View/GetOrganizationByUid.js';
import { ResolveObjectByUid } from '../../../../Flow/Object/ResolveByUid.js';
import { AssignObjectToOrganization } from '../../../../Flow/Object/Organization/Association/AssignObjectToOrganization.js';
import type { CommandSubcommand } from '../../../CommandSubcommand.js';
import { Translate, TranslateFromContext } from '../../../../Services/I18nService.js';

const _subcommandName = `assign`; // subcommand name

/**
 * Build assign subcommand definition
 * @param subcommand SlashCommandSubcommandBuilder Subcommand builder
 * @returns SlashCommandSubcommandBuilder Updated subcommand builder
 */
export function BuildOrganizationAssignSubcommand(
    subcommand: SlashCommandSubcommandBuilder,
): SlashCommandSubcommandBuilder {
    return subcommand
        .setName(_subcommandName)
        .setDescription(Translate(`commands.organization.assign.description`))
        .addStringOption(opt => {
            return opt.setName(`organization`).setDescription(Translate(`commands.organization.assign.options.organization`)).setAutocomplete(true).setRequired(true);
        })
        .addStringOption(opt => {
            return opt.setName(`object`).setDescription(Translate(`commands.organization.assign.options.object`)).setAutocomplete(true).setRequired(true);
        });
}

/**
 * Execute assign subcommand to assign an object to an organization
 * @param interaction InteractionExecutionContextCarrier Discord interaction
 * @returns void
 */
export async function ExecuteOrganizationAssignSubcommand(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const organizationUidRaw = interaction.options.getString(`organization`, true);
        const organizationUid = organizationUidRaw.trim();
        const objectUid = interaction.options.getString(`object`, true).trim();

        const organization = await GetOrganizationByUid(organizationUid);
        if (!organization) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.assign.errors.organizationNotFound`, {
                    params: { organization: organizationUid },
                }),
            });
            return;
        }

        const resolved = await ResolveObjectByUid(objectUid);
        if (!resolved) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.assign.errors.objectNotFound`, {
                    params: { object: objectUid },
                }),
            });
            return;
        }

        const result = await AssignObjectToOrganization(objectUid, organizationUid);
        if (!result.success) {
            const reason = result.error
                ?? TranslateFromContext(interaction.executionContext, `commands.organization.assign.errors.unknownError`);
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.assign.errors.failed`, {
                    params: { reason },
                }),
            });
            return;
        }

        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.assign.messages.success`, {
                params: { name: resolved.name, uid: resolved.uid, organizationUid },
            }),
        });
        log.info(`Object assigned to organization via command`, `OrganizationAssignSubcommand`, `object=${objectUid} org=${organizationUid} by=${interaction.user.id}`);
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Organization assign subcommand failed`, message, `OrganizationAssignSubcommand`);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.assign.errors.failed`, {
                params: { reason: message },
            }),
        });
    } finally {
        // no op
    }
}

/** Exported assign subcommand module */
export const OrganizationAssignSubcommand: CommandSubcommand = {
    subcommandName: _subcommandName,
    BuildSubcommand: BuildOrganizationAssignSubcommand,
    Execute: ExecuteOrganizationAssignSubcommand,
};
