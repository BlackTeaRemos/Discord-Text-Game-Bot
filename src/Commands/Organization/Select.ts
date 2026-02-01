import { ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { log } from '../../Common/Log.js';
import {
    GetUserOrganizations,
    SetUserDefaultOrganization,
    EnsureGlobalOrganizationMembership,
} from '../../Flow/Object/Organization/index.js';

const _orgSelectPrefix = `org_select`; // select menu custom id prefix
const _maxOptions = 25; // max selectable organizations

/**
 * Handle /organization select command.
 * @param interaction Discord interaction.
 * @returns Promise<void> Resolves when selection prompt handled.
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
                content: `You are not assigned to any organizations.`,
            });
            return;
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId(`${_orgSelectPrefix}:${interaction.user.id}`)
            .setPlaceholder(`Select organization`)
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions([
                {
                    label: `Personal (User)`,
                    value: `user`,
                    description: `Execute commands using your personal scope`,
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
            content: `Select the default organization for command execution.`,
            components: [row],
        });
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to present organization selection`, message, `OrganizationSelectCommand`);
        await interaction.editReply({
            content: `Failed to present organization selection: ${message}`,
        });
    }
}
