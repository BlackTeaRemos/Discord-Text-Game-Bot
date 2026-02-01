import type { StringSelectMenuInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import { log } from '../../../../Common/Log.js';
import { SetUserDefaultOrganization } from '../../../../Flow/Object/Organization/Selection/index.js';
import { GetOrganizationByUid } from '../../../../Flow/Object/Organization/View/GetOrganizationByUid.js';
import { GetUserOrganizations } from '../../../../Flow/Object/Organization/View/GetUserOrganizations.js';

const _orgSelectPrefix = `org_select`; // select menu custom id prefix

/**
 * Handle organization selection menu interaction.
 * @param interaction StringSelectMenuInteraction Discord select menu interaction.
 * @returns Promise<boolean> True if handled.
 */
export async function HandleOrganizationSelectControlInteraction(
    interaction: StringSelectMenuInteraction,
): Promise<boolean> {
    if (!interaction.customId.startsWith(_orgSelectPrefix)) {
        return false;
    }

    const parts = interaction.customId.split(`:`); // custom id parts
    const ownerId = parts.length > 1 ? parts[1] : null; // optional owner id guard

    if (ownerId && ownerId !== interaction.user.id) {
        await interaction.reply({
            content: `You cannot select an organization for another user.`,
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    const selectedUid = interaction.values?.[0]; // selected organization uid
    if (!selectedUid) {
        await interaction.reply({
            content: `No organization selected.`,
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    try {
        if (selectedUid === `user`) {
            await SetUserDefaultOrganization(interaction.user.id, `user` as any);
            await interaction.update({
                content: `Default context set to [Personal (User)].`,
                components: [],
            });
            return true;
        }

        const userOrganizations = await GetUserOrganizations(interaction.user.id); // user org list
        const hasMembership = userOrganizations.some(organization => {
            return organization.uid === selectedUid;
        });

        if (!hasMembership) {
            await interaction.reply({
                content: `You cannot select an organization you are not assigned to.`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        const organization = await GetOrganizationByUid(selectedUid);
        if (!organization) {
            await interaction.reply({
                content: `Selected organization is no longer available.`,
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        await SetUserDefaultOrganization(interaction.user.id, selectedUid);
        const name = organization.friendlyName || organization.name; // organization display name

        await interaction.update({
            content: `Default organization set to [${name}].`,
            components: [],
        });

        log.info(
            `Organization default updated via select`,
            `OrganizationSelect`,
            `user=${interaction.user.id} org=${selectedUid}`,
        );
        return true;
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to set default organization`, message, `OrganizationSelect`);
        await interaction.reply({
            content: `Failed to set default organization: ${message}`,
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }
}
