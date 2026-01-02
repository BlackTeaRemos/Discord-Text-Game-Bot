import { ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { getSupportedTypes, listRecordsFor, type ObjectTypeKey } from '../../../Common/Flow/ObjectRegistry.js';
import { PrepareOrganizationPrompt } from '../../Prompt/Organization.js';
import { BuildViewSelectOptions } from '../../../Commands/View/BuildViewSelectOptions.js';
import { GetUserByDiscordId } from '../../../Flow/Object/User/View/GetUserByDiscordId.js';

export interface DescriptionTargetSelection {
    type: ObjectTypeKey;
    id: string;
}

const DESCRIPTION_TYPE_SELECT_ID = `description_select_type`;
const DESCRIPTION_MODE_SELECT_ID = `description_select_mode`;
const DESCRIPTION_OBJECT_SELECT_ID = `description_select_object`;

/**
 * Interactive resolver for a description target.
 * Prompts the user to pick object type, then object.
 * For user and organization targets, an extra mode step is offered: mine vs all.
 *
 * @param interaction ChatInputCommandInteraction Discord slash command interaction.
 * @returns Promise<DescriptionTargetSelection | null> Selected target or null on timeout.
 */
export async function SelectDescriptionTarget(
    interaction: ChatInputCommandInteraction,
): Promise<DescriptionTargetSelection | null> {
    await __EnsureEphemeralReply(interaction);

    const type = await __SelectType(interaction);
    if (!type) {
        return null;
    }

    if (type === `user`) {
        const mode = await __SelectMode(interaction, `User target`);
        if (!mode) {
            return null;
        }

        if (mode === `mine`) {
            const me = await GetUserByDiscordId(interaction.user.id);
            if (!me) {
                await interaction.editReply({ content: `Your user record was not found.`, components: [] });
                return null;
            }
            await interaction.editReply({ content: `Using your user record.`, components: [] });
            return { type, id: me.uid };
        }

        const id = await __SelectObject(interaction, type);
        return id ? { type, id } : null;
    }

    if (type === `organization`) {
        const mode = await __SelectMode(interaction, `Organization target`);
        if (!mode) {
            return null;
        }

        if (mode === `mine`) {
            const id = await __SelectMyOrganization(interaction);
            return id ? { type, id } : null;
        }

        const id = await __SelectObject(interaction, type);
        return id ? { type, id } : null;
    }

    const id = await __SelectObject(interaction, type);
    if (!id) {
        return null;
    }

    return { type, id };
}

async function __EnsureEphemeralReply(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.deferred || interaction.replied) {
        return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
}

async function __SelectType(interaction: ChatInputCommandInteraction): Promise<ObjectTypeKey | null> {
    const typeOptions = getSupportedTypes().map(item => {
        return { label: item.label, value: item.value } as any;
    });

    const menu = new StringSelectMenuBuilder()
        .setCustomId(DESCRIPTION_TYPE_SELECT_ID)
        .setPlaceholder(`Select object type`)
        .addOptions(typeOptions as any);

    await interaction.editReply({
        content: `Select which object you want to create or edit a description for.`,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    });

    const message = await interaction.fetchReply();

    try {
        const collected = await message.awaitMessageComponent({
            filter: component => {
                return component.user.id === interaction.user.id && component.customId === DESCRIPTION_TYPE_SELECT_ID;
            },
            time: 60_000,
        });

        if (!collected.isStringSelectMenu()) {
            return null;
        }

        await collected.deferUpdate();
        return collected.values[0] as ObjectTypeKey;
    } catch {
        await interaction.editReply({ content: `Selection timed out.`, components: [] });
        return null;
    }
}

async function __SelectMode(
    interaction: ChatInputCommandInteraction,
    label: string,
): Promise<`mine` | `all` | null> {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(DESCRIPTION_MODE_SELECT_ID)
        .setPlaceholder(`Select scope`)
        .addOptions([
            { label: `${label}: Mine`, value: `mine` },
            { label: `${label}: All (requires permission)`, value: `all` },
        ] as any);

    await interaction.editReply({
        content: `Choose whether to target only your own records or any record.`,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    });

    const message = await interaction.fetchReply();

    try {
        const collected = await message.awaitMessageComponent({
            filter: component => {
                return component.user.id === interaction.user.id && component.customId === DESCRIPTION_MODE_SELECT_ID;
            },
            time: 60_000,
        });

        if (!collected.isStringSelectMenu()) {
            return null;
        }

        await collected.deferUpdate();
        return collected.values[0] as `mine` | `all`;
    } catch {
        await interaction.editReply({ content: `Selection timed out.`, components: [] });
        return null;
    }
}

async function __SelectMyOrganization(interaction: ChatInputCommandInteraction): Promise<string | null> {
    const prepared = await PrepareOrganizationPrompt({
        userId: interaction.user.id,
        customId: DESCRIPTION_OBJECT_SELECT_ID,
        placeholder: `Select an organization`,
        promptMessage: `Select an organization to edit descriptions for.`,
        emptyMessage: `No organizations found for you.`,
    });

    if (prepared.status === `empty`) {
        await interaction.editReply({ content: prepared.message ?? `No organizations found.`, components: [] });
        return null;
    }

    if (prepared.status === `auto` && prepared.organization) {
        await interaction.editReply({
            content: `Using organization: ${prepared.organization.name}`,
            components: [],
        });
        return prepared.organization.uid;
    }

    await interaction.editReply({
        content: prepared.message ?? `Select an organization.`,
        components: prepared.components ?? [],
    });

    const message = await interaction.fetchReply();

    try {
        const collected = await message.awaitMessageComponent({
            filter: component => {
                return component.user.id === interaction.user.id && component.customId === DESCRIPTION_OBJECT_SELECT_ID;
            },
            time: 60_000,
        });

        if (!collected.isStringSelectMenu()) {
            return null;
        }

        await collected.deferUpdate();
        return collected.values[0];
    } catch {
        await interaction.editReply({ content: `Selection timed out.`, components: [] });
        return null;
    }
}

async function __SelectObject(interaction: ChatInputCommandInteraction, type: ObjectTypeKey): Promise<string | null> {
    const records = await listRecordsFor(type);
    const options = BuildViewSelectOptions(records, 25);

    if (options.length === 0) {
        await interaction.editReply({ content: `No ${type} records found.`, components: [] });
        return null;
    }

    const menu = new StringSelectMenuBuilder()
        .setCustomId(DESCRIPTION_OBJECT_SELECT_ID)
        .setPlaceholder(`Select ${type}`)
        .addOptions(options as any);

    await interaction.editReply({
        content: `Select which ${type} you want to work with. Showing up to ${options.length} items.`,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    });

    const message = await interaction.fetchReply();

    try {
        const collected = await message.awaitMessageComponent({
            filter: component => {
                return component.user.id === interaction.user.id && component.customId === DESCRIPTION_OBJECT_SELECT_ID;
            },
            time: 60_000,
        });

        if (!collected.isStringSelectMenu()) {
            return null;
        }

        await collected.deferUpdate();
        return collected.values[0];
    } catch {
        await interaction.editReply({ content: `Selection timed out.`, components: [] });
        return null;
    }
}
