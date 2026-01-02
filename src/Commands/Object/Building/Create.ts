import {
    SlashCommandSubcommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalSubmitInteraction,
    MessageFlags,
} from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { CreateFactory } from '../../../Flow/Object/Building/Create.js';
import { log } from '../../../Common/Log.js';
import { executeWithContext } from '../../../Common/ExecutionContextHelpers.js';
import type { ExecutionContext } from '../../../Domain/index.js';
import { resolve, type TokenSegmentInput } from '../../../Common/Permission/index.js';
import { PrepareOrganizationPrompt, ResolveOrganizationName } from '../../../SubCommand/Prompt/Organization.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';

interface FlowState {
    type: string;
    orgUid: string;
    orgName?: string;
    desc: string;
}

type StepContext = {
    state: FlowState;
    executionContext?: ExecutionContext;
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    userId: string;
};

export const data = new SlashCommandSubcommandBuilder()
    .setName(`create`)
    .setDescription(`Interactive create a new factory`);

export const permissionTokens: TokenSegmentInput[][] = [[`object`, `building`, `create`]];

export async function execute(interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>) {
    await executeWithContext(interaction, async (flowManager, executionContext) => {
        // Interactive flow: select organization, then collect type, description, optional UID
        await flowManager
            .builder(
                interaction.user.id,
                interaction as any,
                { type: ``, orgUid: ``, orgName: ``, desc: `` },
                executionContext,
            )
            .step(`factory_select_org`)
            .prompt(async (ctx: StepContext) => {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const prompt = await PrepareOrganizationPrompt({
                    userId: interaction.user.id,
                    customId: `factory_select_org`,
                    placeholder: `Select organization`,
                    promptMessage: `Choose organization to continue.`,
                    emptyMessage: `You are not linked to any organization. Cannot create factory.`,
                });
                if (prompt.status === `empty`) {
                    await interaction.editReply({
                        content: prompt.message ?? `You are not linked to any organization. Cannot create factory.`,
                        components: [],
                    });
                    return;
                }
                if (prompt.status === `auto` && prompt.organization) {
                    ctx.state.orgUid = prompt.organization.uid;
                    ctx.state.orgName = prompt.organization.name;
                    return;
                }
                await interaction.editReply({
                    content: prompt.message ?? `Choose organization to continue.`,
                    components: prompt.components ?? [],
                });
            })
            .onInteraction(async (ctx: StepContext, select: any) => {
                if (!select.isStringSelectMenu() || select.customId !== `factory_select_org`) {
                    return false;
                }
                ctx.state.orgUid = select.values[0];
                ctx.state.orgName =
                    (await ResolveOrganizationName(interaction.user.id, select.values[0])) || select.values[0];
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
                    );
                await (ctx.interaction as ChatInputCommandInteraction).showModal(modal);
            })
            .onInteraction(async (ctx: StepContext, interaction: any) => {
                if (interaction.isModalSubmit()) {
                    const fields = interaction.fields;
                    ctx.state.type = fields.getTextInputValue(`type`).trim();
                    ctx.state.desc = fields.getTextInputValue(`desc`).trim();
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
                    const factory = await CreateFactory(ctx.state.type, ctx.state.orgUid, ctx.state.desc);
                    await (ctx.interaction as ChatInputCommandInteraction).followUp({
                        content: `Factory '${factory.type}' created under the selected organization.`,
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
