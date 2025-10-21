import {
    SlashCommandSubcommandBuilder,
    ChatInputCommandInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalSubmitInteraction,
    MessageFlags,
    StringSelectMenuBuilder,
} from 'discord.js';
import { CreateFactory } from '../../../Flow/Object/Building/Create.js';
import { log } from '../../../Common/Log.js';
import { executeWithContext } from '../../../Common/ExecutionContextHelpers.js';
import type { ExecutionContext } from '../../../Domain/index.js';
import { resolve, type TokenSegmentInput } from '../../../Common/permission/index.js';
import { GetUserOrganizations } from '../../../Flow/Command/Description/GetUserOrganizations.js';

interface FlowState {
    type: string;
    orgUid: string;
    orgName?: string;
    desc: string;
    uid?: string;
}

type StepContext = {
    state: FlowState;
    executionContext?: ExecutionContext;
    interaction: ChatInputCommandInteraction;
    userId: string;
};

export const data = new SlashCommandSubcommandBuilder()
    .setName(`create`)
    .setDescription(`Interactive create a new factory`);

export const permissionTokens: TokenSegmentInput[][] = [[`object`, `building`, `create`]];

export async function execute(interaction: ChatInputCommandInteraction) {
    await executeWithContext(interaction, async (flowManager, executionContext) => {
        // Interactive flow: select organization, then collect type, description, optional UID
        await flowManager
            .builder(
                interaction.user.id,
                interaction as any,
                { type: ``, orgUid: ``, orgName: ``, desc: ``, uid: `` },
                executionContext,
            )
            .step(`factory_select_org`)
            .prompt(async (ctx: StepContext) => {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const orgs = await GetUserOrganizations(interaction.user.id);
                if (orgs.length === 0) {
                    await interaction.editReply({
                        content: `You are not linked to any organization. Cannot create factory.`,
                    });
                    return;
                }
                if (orgs.length === 1) {
                    ctx.state.orgUid = orgs[0].uid;
                    ctx.state.orgName = orgs[0].name;
                    return;
                }
                const options = orgs
                    .map(org => {
                        return {
                            label: org.name.slice(0, 50),
                            value: org.uid,
                        };
                    })
                    .slice(0, 25);
                const menu = new StringSelectMenuBuilder()
                    .setCustomId(`factory_select_org`)
                    .setPlaceholder(`Select organization`)
                    .addOptions(options as any);
                await interaction.editReply({
                    content: `Choose organization to continue.`,
                    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
                });
            })
            .onInteraction(async (ctx: StepContext, select: any) => {
                if (!select.isStringSelectMenu() || select.customId !== `factory_select_org`) {
                    return false;
                }
                ctx.state.orgUid = select.values[0];
                const match = select.component.options?.find((option: any) => {
                    return option.value === select.values[0];
                });
                ctx.state.orgName = match?.label || select.values[0];
                await select.deferUpdate();
                return true;
            })
            .next()
            .step(`factory_modal`)
            .prompt(async (ctx: StepContext) => {
                const modal = new ModalBuilder()
                    .setCustomId(`factory_modal`)
                    .setTitle(`New Factory`)
                    .addComponents(
                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                            new TextInputBuilder()
                                .setCustomId(`type`)
                                .setLabel(`Factory Type`)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true),
                        ),
                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                            new TextInputBuilder()
                                .setCustomId(`desc`)
                                .setLabel(`Factory Description`)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true),
                        ),
                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                            new TextInputBuilder()
                                .setCustomId(`uid`)
                                .setLabel(`Custom UID`)
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false),
                        ),
                    );
                await (ctx.interaction as ChatInputCommandInteraction).showModal(modal);
            })
            .onInteraction(async (ctx: StepContext, interaction: any) => {
                if (interaction.isModalSubmit()) {
                    const fields = interaction.fields;
                    ctx.state.type = fields.getTextInputValue(`type`).trim();
                    ctx.state.desc = fields.getTextInputValue(`desc`).trim();
                    const custom = fields.getTextInputValue(`uid`).trim();
                    ctx.state.uid = custom || undefined;
                    await interaction.deferUpdate();
                    return true;
                }
                return false;
            })
            .next()
            .step()
            .prompt(async (ctx: StepContext) => {
                const baseInteraction = ctx.interaction as ChatInputCommandInteraction;
                if (!baseInteraction.deferred && !baseInteraction.replied) {
                    await baseInteraction.deferReply({ flags: MessageFlags.Ephemeral });
                }
                const member = baseInteraction.guild
                    ? await baseInteraction.guild.members.fetch(baseInteraction.user.id).catch(() => {
                          return null;
                      })
                    : null;
                const permissionResult = await resolve([``]);
                if (!permissionResult.success) {
                    const denialReason = permissionResult.detail.reason ?? `Permission denied.`;
                    await baseInteraction.followUp({
                        content: denialReason,
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }
                try {
                    const factory = await CreateFactory(
                        ctx.state.type,
                        ctx.state.orgUid,
                        ctx.state.desc,
                        ctx.state.uid,
                    );
                    await (ctx.interaction as ChatInputCommandInteraction).followUp({
                        content: `Factory ${factory.uid} '${factory.type}' created under organization ${factory.organizationUid}.`,
                        flags: MessageFlags.Ephemeral,
                    });
                } catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    log.error(`Error creating factory`, msg, `createFactory`);
                    await (ctx.interaction as ChatInputCommandInteraction).followUp({
                        content: `Error creating factory`,
                        flags: MessageFlags.Ephemeral,
                    });
                }
            })
            .next()
            .start();
    });
}
