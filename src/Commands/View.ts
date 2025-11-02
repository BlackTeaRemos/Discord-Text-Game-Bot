import {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    MessageFlags,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import type { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { flowManager } from '../Common/Flow/Manager.js';
import { executeWithContext } from '../Common/ExecutionContextHelpers.js';
import { getSupportedTypes } from '../Common/Flow/ObjectRegistry.js';
import { neo4jClient } from '../Setup/Neo4j.js';
import { log } from '../Common/Log.js';
import { GetGame } from '../Flow/Object/Game/View.js';
import { createGameUpdateState } from '../Flow/Object/Game/Create.js';
import { ResolveViewPermissions } from '../Flow/Command/ViewFlow.js';
import { RequestPermissionFromAdmin } from '../SubCommand/Permission/PermissionUI.js';
import { GrantForever } from '../Common/Permission/index.js';
import { PrepareOrganizationPrompt, ResolveOrganizationName } from '../SubCommand/Prompt/Organization.js';
import type { InteractionExecutionContextCarrier } from '../Common/Type/Interaction.js';
import { BuildGamePreviewEmbed } from '../SubCommand/Object/Game/Renderers/BuildGamePreviewEmbed.js';
import { BuildControlsContent } from '../SubCommand/Object/Game/Renderers/BuildControlsContent.js';
import { BuildControlRows } from '../SubCommand/Object/Game/Renderers/BuildControlRows.js';
import { RegisterGameCreateSession } from '../SubCommand/Object/Game/GameCreateControls.js';

export const data = new SlashCommandBuilder().setName(`view`).setDescription(`Interactive view of stored objects`);
export const permissionTokens = `command:view`;

interface State {
    type?: string;
    id?: string;
    orgUid?: string; // selected organization for description context
    orgName?: string;
}

interface GameUpdateContext {
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    gameUid: string;
    orgUid?: string;
    orgName?: string;
    registeredAt: number;
}

const GAME_UPDATE_BUTTON_ID = `view_game_update_start`;
const gameUpdateContextByMessage = new Map<string, GameUpdateContext>();

// Ensure select menu options have unique values and fit Discord constraints
function uniqueSelectOptions<T extends { value: string }>(options: T[], max = 25): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const o of options) {
        const v = (o.value ?? ``).toString();
        if (!v) {
            continue;
        } // skip empty values
        if (seen.has(v)) {
            continue;
        }
        seen.add(v);
        out.push(o);
        if (out.length >= max) {
            break;
        }
    }
    return out;
}

function buildGameUpdateButtonRow(disabled: boolean): ActionRowBuilder<ButtonBuilder> {
    const label = disabled ? `Editing in progress` : `Edit game`;
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(GAME_UPDATE_BUTTON_ID)
            .setLabel(label)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
    );
}

export async function execute(interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>) {
    await executeWithContext(interaction, async (flowManager, executionContext) => {
        await flowManager
            .builder(interaction.user.id, interaction, {} as State, executionContext)
            .step(`select_type`)
            .prompt(async (ctx: any) => {
                const options = uniqueSelectOptions(getSupportedTypes());
                const select = new StringSelectMenuBuilder()
                    .setCustomId(`select_type`)
                    .setPlaceholder(`Select object type`)
                    .addOptions(options);
                await (ctx.interaction as ChatInputCommandInteraction).deferReply({ flags: MessageFlags.Ephemeral });
                await (ctx.interaction as ChatInputCommandInteraction).editReply({
                    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
                });
            })
            .onInteraction(async (ctx: any, interaction: any) => {
                if (!interaction.isStringSelectMenu()) {
                    return false;
                }
                ctx.state.type = interaction.values[0];
                await interaction.deferUpdate();
                return true;
            })
            .next()
            .step(`select_object`)
            .prompt(async (ctx: any) => {
                const type = ctx.state.type!;

                let records: Array<{ uid: string; label: string }> = [];
                const session = await neo4jClient.GetSession(`READ`);
                try {
                    const queryMap: Record<string, string> = {
                        game: `MATCH (g:Game) RETURN g.uid AS uid, g.name AS label`,
                        organization: `MATCH (o:Organization) RETURN o.uid AS uid, o.name AS label`,
                        user: `MATCH (u:User) RETURN u.uid AS uid, u.discord_id AS label`,
                        building: `MATCH (f:Factory) RETURN f.uid AS uid, f.type AS label`,
                        description: `MATCH (d:Description) RETURN d.uid AS uid, d.text AS label`,
                    };
                    const result = await session.run(queryMap[type]);
                    records = result.records.map(r => {
                        return { uid: r.get(`uid`), label: r.get(`label`) };
                    });
                } finally {
                    await session.close();
                }
                const options = records.map(r => {
                    return { label: r.label.toString().slice(0, 50), value: r.uid.toString() };
                });
                // If there are no options, avoid sending an empty select (Discord rejects it)
                if (options.length === 0) {
                    await (ctx.interaction as ChatInputCommandInteraction).editReply({
                        content: `No ${type} objects found.`,
                        components: [],
                    });
                    return;
                }
                const select = new StringSelectMenuBuilder()
                    .setCustomId(`select_object`)
                    .setPlaceholder(`Select object to view`)
                    .addOptions(options);
                // Update existing ephemeral reply with new select menu for object selection
                try {
                    await (ctx.interaction as ChatInputCommandInteraction).editReply({
                        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
                    });
                } catch (err) {
                    log.error(`Failed to editReply for select_object`, String(err), `ViewCommand`);
                    throw err;
                }
            })
            .onInteraction(async (ctx: any, interaction: any) => {
                if (!interaction.isStringSelectMenu()) {
                    return false;
                }
                ctx.state.id = interaction.values[0];
                await interaction.deferUpdate();
                return true;
            })
            .next()
            .step(`select_view_org`)
            .prompt(async (ctx: any) => {
                // For objects that support descriptions, select organization per rules
                const describable = [`game`, `organization`, `user`, `building`];
                if (!describable.includes(ctx.state.type)) {
                    await ctx.advance();
                    return;
                }
                const prompt = await PrepareOrganizationPrompt({
                    userId: (interaction as ChatInputCommandInteraction).user.id,
                    customId: `select_view_org`,
                    placeholder: `Select organization context for description`,
                    promptMessage: `Select organization context for description`,
                });
                if (prompt.status === `empty`) {
                    // No orgs: use public/general later by passing empty orgUid
                    ctx.state.orgUid = ``;
                    ctx.state.orgName = `Public`;
                    await ctx.advance();
                    return;
                }
                if (prompt.status === `auto` && prompt.organization) {
                    ctx.state.orgUid = prompt.organization.uid;
                    ctx.state.orgName = prompt.organization.name;
                    await ctx.advance();
                    return;
                }
                await (interaction as ChatInputCommandInteraction).editReply({
                    components: prompt.components ?? [],
                });
            })
            .onInteraction(async (ctx: any, interaction: any) => {
                if (!interaction.isStringSelectMenu()) {
                    return false;
                }
                ctx.state.orgUid = interaction.values[0];
                ctx.state.orgName = await ResolveOrganizationName(
                    (interaction as ChatInputCommandInteraction).user.id,
                    ctx.state.orgUid,
                );
                await interaction.deferUpdate();
                return true;
            })
            .next()
            .step(`show_details`)
            .prompt(async (ctx: any) => {
                const type = ctx.state.type!;
                const id = ctx.state.id!;
                const baseInteraction = ctx.interaction as ChatInputCommandInteraction;

                const permission = await ResolveViewPermissions(baseInteraction, { type, id });
                if (!permission.allowed) {
                    if (permission.requiresApproval) {
                        try {
                            await baseInteraction.deferReply({ ephemeral: true });
                        } catch {}
                        const decision = await RequestPermissionFromAdmin(baseInteraction, {
                            tokens: permission.tokens,
                            reason: permission.reason,
                        });
                        if (decision === `approve_forever` && baseInteraction.guildId) {
                            GrantForever(baseInteraction.guildId, baseInteraction.user.id, permission.tokens[0] ?? []);
                        }
                        if (decision !== `approve_forever` && decision !== `approve_once`) {
                            await baseInteraction.followUp({
                                content: `Permission denied or no admin response.`,
                                flags: MessageFlags.Ephemeral,
                            });
                            return;
                        }
                        // otherwise continue to show details
                    } else {
                        await baseInteraction.followUp({
                            content: permission.reason ?? `You are not allowed to view this item.`,
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }
                }

                if (type === `game`) {
                    const game = await GetGame(id);
                    if (!game) {
                        await baseInteraction.followUp({
                            content: `Game not found. It may have been removed recently.`,
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }

                    const embed = new EmbedBuilder()
                        .setColor(`Blue`)
                        .setTitle(game.name || `Game details`)
                        .setDescription(game.description ?? `No description available.`)
                        .addFields({ name: `UID`, value: game.uid ?? `n/a`, inline: true })
                        .addFields({ name: `Server`, value: game.serverId ?? `n/a`, inline: true });

                    if (game.image) {
                        embed.setThumbnail(game.image);
                    }
                    if (ctx.state.orgName) {
                        embed.addFields({ name: `Organization`, value: ctx.state.orgName, inline: true });
                    }

                    try {
                        const response = await baseInteraction.followUp({
                            embeds: [embed],
                            components: [buildGameUpdateButtonRow(false)],
                            flags: MessageFlags.Ephemeral,
                        });
                        registerGameUpdateContext(response.id, {
                            interaction:
                                ctx.interaction as InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
                            gameUid: game.uid,
                            orgUid: ctx.state.orgUid,
                            orgName: ctx.state.orgName,
                            registeredAt: Date.now(),
                        });
                    } catch (err) {
                        log.error(`Failed to followUp in show_details`, String(err), `ViewCommand`);
                        throw err;
                    }
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`Details`)
                    .setColor(`Blue`)
                    .setDescription(`Viewing for type ${type} not implemented.`);
                try {
                    await baseInteraction.followUp({
                        embeds: [embed],
                        flags: MessageFlags.Ephemeral,
                    });
                } catch (err) {
                    log.error(`Failed to followUp in show_details`, String(err), `ViewCommand`);
                    throw err;
                }
            })
            .next()
            .start();
    });
}

function registerGameUpdateContext(messageId: string, context: GameUpdateContext): void {
    pruneExpiredGameUpdateContexts();
    gameUpdateContextByMessage.set(messageId, context);
}

function pruneExpiredGameUpdateContexts(): void {
    const expiration = Date.now() - 10 * 60 * 1000;
    for (const [messageId, context] of gameUpdateContextByMessage.entries()) {
        if (context.registeredAt < expiration) {
            gameUpdateContextByMessage.delete(messageId);
        }
    }
}

async function disableGameUpdateButton(interaction: ButtonInteraction, context: GameUpdateContext): Promise<void> {
    try {
        await context.interaction.webhook.editMessage(interaction.message.id, {
            components: [buildGameUpdateButtonRow(true)],
        });
    } catch (error) {
        log.warning(
            `Failed to disable game update button for ${interaction.message.id}: ${String(error)}`,
            `ViewCommand`,
            `disableGameUpdateButton`,
        );
    }
}

export async function HandleViewGameUpdateInteraction(interaction: ButtonInteraction): Promise<boolean> {
    if (interaction.customId !== GAME_UPDATE_BUTTON_ID) {
        return false;
    }

    const context = gameUpdateContextByMessage.get(interaction.message.id);
    if (!context) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({
                content: `This edit control is no longer active. Run /view again to start a new session.`,
                flags: MessageFlags.Ephemeral,
            });
        }
        return true;
    }

    gameUpdateContextByMessage.delete(interaction.message.id);

    try {
        await interaction.deferUpdate();
    } catch {}

    await disableGameUpdateButton(interaction, context);

    const baseInteraction = context.interaction;
    if (!baseInteraction.guildId) {
        await baseInteraction.followUp({
            content: `Game updates must be started inside a server.`,
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    const game = await GetGame(context.gameUid);
    if (!game) {
        await baseInteraction.followUp({
            content: `Game no longer exists.`,
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    const state = createGameUpdateState({
        serverId: baseInteraction.guildId,
        ownerDiscordId: baseInteraction.user.id,
        game,
        description: game.description,
        organizationUid: context.orgUid,
        organizationName: context.orgName,
    });

    try {
        const previewMessage = await baseInteraction.followUp({
            content: `Preview how your game will appear after saving changes.`,
            embeds: [BuildGamePreviewEmbed(state)],
            flags: MessageFlags.Ephemeral,
        });
        state.previewMessageId = previewMessage.id;

        const controlsMessage = await baseInteraction.followUp({
            content: BuildControlsContent(state),
            components: BuildControlRows(state),
            flags: MessageFlags.Ephemeral,
        });
        state.controlsMessageId = controlsMessage.id;

        await RegisterGameCreateSession({
            interaction: baseInteraction,
            state,
            previewMessageId: state.previewMessageId,
            controlsMessageId: state.controlsMessageId,
        });
    } catch (error) {
        log.error(
            `Failed to start game update session: ${String(error)}`,
            `ViewCommand`,
            `HandleViewGameUpdateInteraction`,
        );
        await baseInteraction.followUp({
            content: `Unable to start game update due to an unexpected error.`,
            flags: MessageFlags.Ephemeral,
        });
    }

    return true;
}

export const __viewCommandTesting = {
    registerGameUpdateContext,
    resetGameUpdateContexts: (): void => {
        gameUpdateContextByMessage.clear();
    },
};
