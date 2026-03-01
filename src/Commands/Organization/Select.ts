import { ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { Log } from '../../Common/Log.js';
import {
    GetUserOrganizations,
    SetUserDefaultOrganization,
    EnsureGlobalOrganizationMembership,
} from '../../Flow/Object/Organization/index.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

const _orgSelectPrefix = `org_select`; // select menu custom id prefix
const _maxOptions = 25; // max selectable organizations

/**
 * Handle organization select command
 * @param interaction Discord interaction
 * @returns void
 */
export async function ExecuteOrganizationSelect(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        await EnsureGlobalOrganizationMembership(interaction.user.id, true);
        const organizations = await GetUserOrganizations(interaction.user.id); // user organization list
        if (organizations.length === 0) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.organization.select.errors.noOrganizations`),
            });
            return;
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId(`${_orgSelectPrefix}:${interaction.user.id}`)
            .setPlaceholder(TranslateFromContext(interaction.executionContext, `commands.organization.select.labels.placeholder`))
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions([
                {
                    label: TranslateFromContext(interaction.executionContext, `commands.organization.select.labels.personal`),
                    value: `user`,
                    description: TranslateFromContext(interaction.executionContext, `commands.organization.select.labels.personalDescription`),
                },
                ...organizations.slice(0, _maxOptions - 1).map(organization => {
                    return {
                        label: organization.friendlyName || organization.name,
                        value: organization.uid,
                        description: organization.uid,
                    };
                }),
            ]);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.select.messages.prompt`),
            components: [row],
        });
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Failed to present organization selection`, message, `OrganizationSelectCommand`);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.organization.select.errors.failed`, {
                params: { message },
            }),
        });
    }
}
