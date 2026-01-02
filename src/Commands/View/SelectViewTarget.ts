import { ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { getSupportedTypes, listRecordsFor, type ObjectTypeKey } from '../../Common/Flow/ObjectRegistry.js';
import { PrepareOrganizationPrompt } from '../../SubCommand/Prompt/Organization.js';
import { BuildViewSelectOptions } from './BuildViewSelectOptions.js';

export interface ViewTargetSelection {
    type: ObjectTypeKey;
    id: string;
}

const VIEW_TYPE_SELECT_ID = `view_select_type`;
const VIEW_OBJECT_SELECT_ID = `view_select_object`;

/**
 * Interactive resolver for a /view target.
 * Prompts the user to select a type, then select an object of that type.
 *
 * @param interaction ChatInputCommandInteraction Discord slash command interaction.
 * @param seed Partial<ViewTargetSelection> Optional pre-selected values.
 * @returns Promise<ViewTargetSelection | null> Selected target or null when cancelled/timed out.
 */
export async function SelectViewTarget(
    interaction: ChatInputCommandInteraction,
    seed?: Partial<ViewTargetSelection>,
): Promise<ViewTargetSelection | null> {
    await __EnsureEphemeralReply(interaction);

    const type = seed?.type ?? (await __SelectType(interaction));
    if (!type) {
        return null;
    }

    const id = seed?.id ?? (await __SelectObject(interaction, type));
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
        .setCustomId(VIEW_TYPE_SELECT_ID)
        .setPlaceholder(`Select object type`)
        .addOptions(typeOptions as any);

    await interaction.editReply({
        content: `Select which object type you want to view.`,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    });

    const message = await interaction.fetchReply();

    try {
        const collected = await message.awaitMessageComponent({
            filter: component => {
                return component.user.id === interaction.user.id && component.customId === VIEW_TYPE_SELECT_ID;
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

async function __SelectObject(
    interaction: ChatInputCommandInteraction,
    type: ObjectTypeKey,
): Promise<string | null> {
    if (type === `organization`) {
        const prepared = await PrepareOrganizationPrompt({
            userId: interaction.user.id,
            customId: VIEW_OBJECT_SELECT_ID,
            placeholder: `Select an organization`,
            promptMessage: `Select an organization to view.`,
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
            content: prepared.message ?? `Select an organization to view.`,
            components: prepared.components ?? [],
        });

        const message = await interaction.fetchReply();
        try {
            const collected = await message.awaitMessageComponent({
                filter: component => {
                    return component.user.id === interaction.user.id && component.customId === VIEW_OBJECT_SELECT_ID;
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

    const records = await listRecordsFor(type);
    const options = BuildViewSelectOptions(records, 25);

    if (options.length === 0) {
        await interaction.editReply({ content: `No ${type} records found.`, components: [] });
        return null;
    }

    const menu = new StringSelectMenuBuilder()
        .setCustomId(VIEW_OBJECT_SELECT_ID)
        .setPlaceholder(`Select ${type}`)
        .addOptions(options as any);

    await interaction.editReply({
        content: `Select which ${type} you want to view. Showing up to ${options.length} items.`,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    });

    const message = await interaction.fetchReply();

    try {
        const collected = await message.awaitMessageComponent({
            filter: component => {
                return component.user.id === interaction.user.id && component.customId === VIEW_OBJECT_SELECT_ID;
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
