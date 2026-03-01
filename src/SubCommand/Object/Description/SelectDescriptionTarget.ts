import { ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { GetSupportedTypes, ListRecordsFor, type ObjectTypeKey } from '../../../Common/Flow/ObjectRegistry.js';
import { PrepareOrganizationPrompt } from '../../Prompt/Organization.js';
import { BuildViewSelectOptions } from '../../../Common/BuildViewSelectOptions.js';
import { GetUserByDiscordId } from '../../../Flow/Object/User/View/GetUserByDiscordId.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import { TranslateFromContext } from '../../../Services/I18nService.js';

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
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<DescriptionTargetSelection | null> {
    await __EnsureEphemeralReply(interaction);

    const type = await __SelectType(interaction);
    if (!type) {
        return null;
    }

    if (type === `user`) {
        const mode = await __SelectMode(interaction, TranslateFromContext(interaction.executionContext, `descriptionTarget.userLabel`));
        if (!mode) {
            return null;
        }

        if (mode === `mine`) {
            const me = await GetUserByDiscordId(interaction.user.id);
            if (!me) {
                await interaction.editReply({ content: TranslateFromContext(interaction.executionContext, `descriptionTarget.userNotFound`), components: [] });
                return null;
            }
            await interaction.editReply({ content: TranslateFromContext(interaction.executionContext, `descriptionTarget.usingUserRecord`), components: [] });
            return { type, id: me.uid };
        }

        const id = await __SelectObject(interaction, type);
        return id ? { type, id } : null;
    }

    if (type === `organization`) {
        const mode = await __SelectMode(interaction, TranslateFromContext(interaction.executionContext, `descriptionTarget.organizationLabel`));
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

async function __SelectType(interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>): Promise<ObjectTypeKey | null> {
    const typeOptions = GetSupportedTypes().map(item => {
        return { label: item.label, value: item.value } as any;
    });

    if (typeOptions.length === 1) {
        return typeOptions[0].value;
    }

    const menu = new StringSelectMenuBuilder()
        .setCustomId(DESCRIPTION_TYPE_SELECT_ID)
        .setPlaceholder(TranslateFromContext(interaction.executionContext, `descriptionTarget.selectObjectType`))
        .addOptions(typeOptions as any);

    await interaction.editReply({
        content: TranslateFromContext(interaction.executionContext, `descriptionTarget.selectObjectPrompt`),
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
        await interaction.editReply({ content: TranslateFromContext(interaction.executionContext, `descriptionTarget.selectionTimeout`), components: [] });
        return null;
    }
}

async function __SelectMode(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
    label: string,
): Promise<`mine` | `all` | null> {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(DESCRIPTION_MODE_SELECT_ID)
        .setPlaceholder(TranslateFromContext(interaction.executionContext, `descriptionTarget.selectScope`))
        .addOptions([
            { label: TranslateFromContext(interaction.executionContext, `descriptionTarget.scopeMine`, { params: { label } }), value: `mine` },
            { label: TranslateFromContext(interaction.executionContext, `descriptionTarget.scopeAll`, { params: { label } }), value: `all` },
        ] as any);

    await interaction.editReply({
        content: TranslateFromContext(interaction.executionContext, `descriptionTarget.scopePrompt`),
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
        await interaction.editReply({ content: TranslateFromContext(interaction.executionContext, `descriptionTarget.selectionTimeout`), components: [] });
        return null;
    }
}

async function __SelectMyOrganization(interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>): Promise<string | null> {
    const prepared = await PrepareOrganizationPrompt({
        userId: interaction.user.id,
        customId: DESCRIPTION_OBJECT_SELECT_ID,
        placeholder: TranslateFromContext(interaction.executionContext, `descriptionTarget.selectOrganization`),
        promptMessage: TranslateFromContext(interaction.executionContext, `descriptionTarget.selectOrganizationPrompt`),
        emptyMessage: TranslateFromContext(interaction.executionContext, `descriptionTarget.noOrganizationsForUser`),
    });

    if (prepared.status === `empty`) {
        await interaction.editReply({ content: prepared.message ?? TranslateFromContext(interaction.executionContext, `descriptionTarget.noOrganizations`), components: [] });
        return null;
    }

    if (prepared.status === `auto` && prepared.organization) {
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `descriptionTarget.usingOrganization`, { params: { name: prepared.organization.name } }),
            components: [],
        });
        return prepared.organization.uid;
    }

    await interaction.editReply({
        content: prepared.message ?? TranslateFromContext(interaction.executionContext, `descriptionTarget.selectOrganizationFallback`),
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
        await interaction.editReply({ content: TranslateFromContext(interaction.executionContext, `descriptionTarget.selectionTimeout`), components: [] });
        return null;
    }
}

async function __SelectObject(interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>, type: ObjectTypeKey): Promise<string | null> {
    const records = await ListRecordsFor(type);
    const options = BuildViewSelectOptions(records, 25);

    if (options.length === 0) {
        await interaction.editReply({ content: TranslateFromContext(interaction.executionContext, `descriptionTarget.noRecords`, { params: { type } }), components: [] });
        return null;
    }

    if (options.length === 1) {
        return options[0].value;
    }

    const menu = new StringSelectMenuBuilder()
        .setCustomId(DESCRIPTION_OBJECT_SELECT_ID)
        .setPlaceholder(TranslateFromContext(interaction.executionContext, `descriptionTarget.selectType`, { params: { type } }))
        .addOptions(options as any);

    await interaction.editReply({
        content: TranslateFromContext(interaction.executionContext, `descriptionTarget.selectTypePrompt`, { params: { type, count: options.length } }),
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
        await interaction.editReply({ content: TranslateFromContext(interaction.executionContext, `descriptionTarget.selectionTimeout`), components: [] });
        return null;
    }
}
