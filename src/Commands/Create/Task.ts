import { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { ChatInputCommandInteraction, Message, MessageContextMenuCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { GetGameCurrentTurn } from '../../Flow/Object/Game/Turn.js';
import { CreateTaskRecord } from '../../Flow/Task/Command/CreateTaskRecord.js';
import { RemoveTask } from '../../Flow/Task/Command/RemoveTask.js';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { flowManager } from '../../Common/Flow/Manager.js';
import { Log } from '../../Common/Log.js';
import { ResolveExecutionOrganization } from '../../Flow/Object/Organization/Selection/ResolveExecutionOrganization.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

/**
 * Create task from replied message for current turn
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when task is created
 */
export async function ExecuteCreateTask(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const delay = interaction.options.getInteger(`delay`) ?? 0;
    await __CreateTaskFromInteraction(interaction, delay);
}

/**
 * Create task from message context menu selection
 * @param interaction InteractionExecutionContextCarrier<MessageContextMenuCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when task is created
 */
export async function ExecuteCreateTaskFromMessageContext(
    interaction: InteractionExecutionContextCarrier<MessageContextMenuCommandInteraction>,
): Promise<void> {
    const delay = 0;
    await __CreateTaskFromInteraction(interaction, delay);
}

async function __CreateTaskFromInteraction(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction | MessageContextMenuCommandInteraction>,
    delay: number,
): Promise<void> {
    const serverId = interaction.guildId;
    if (!serverId) {
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.create.task.errors.serverOnly`),
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const targetMessage = await __FetchTargetMessage(interaction);
        if (!targetMessage) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.create.task.errors.noTargetMessage`),
            });
            return;
        }

        const messageContent = targetMessage.content?.trim();
        if (!messageContent) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.create.task.errors.noMessageContent`),
            });
            return;
        }

        const shortDescription = __BuildShortDescription(messageContent);

        const games = await ListGamesForServer(serverId);
        const game = games[0];
        if (!game) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.create.task.errors.noGame`),
            });
            return;
        }

        const currentTurn = await GetGameCurrentTurn(game.uid);
        const targetTurn = currentTurn + delay;

        const executionOrganization = await ResolveExecutionOrganization(interaction.user.id, null);
        const organizationUid = executionOrganization.scopeType === `organization` && executionOrganization.organizationUid ? executionOrganization.organizationUid : ``;

        const task = await CreateTaskRecord(neo4jClient, {
            organizationUid: organizationUid || ``,
            gameUid: game.uid,
            turnNumber: targetTurn,
            creatorDiscordId: interaction.user.id,
            shortDescription,
            description: messageContent,
        });

        const turnLabel = delay === 0
            ? `current turn (${targetTurn})`
            : `turn ${targetTurn} (delay: ${delay > 0 ? `+` : ``}${delay})`;

        const userLabel = TranslateFromContext(interaction.executionContext, `commands.view.common.user`);
        const organizationName = executionOrganization.organizationName || userLabel;
        const REMOVE_ID = `remove_task_${task.id}`;
        const executionContext = interaction.executionContext;

        await flowManager
            .builder(interaction.user.id, interaction, { task, organizationUid })
            .step([REMOVE_ID], `create_task_success`)
            .prompt(async(ctx) => {
                const removeButton = new ButtonBuilder()
                    .setCustomId(REMOVE_ID)
                    .setLabel(TranslateFromContext(executionContext, `commands.create.task.actions.remove`))
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(removeButton);
                const preview = `${messageContent.slice(0, 100)}${messageContent.length > 100 ? `...` : ``}`;

                await interaction.editReply({
                    content: TranslateFromContext(executionContext, `commands.create.task.messages.created`, {
                        params: { organization: organizationName, id: task.id, preview },
                    }),
                    components: [row],
                });
            })
            .onInteraction(async(ctx, incomingInteraction) => {
                if (!incomingInteraction.isButton() || incomingInteraction.customId !== REMOVE_ID) {
                    return false;
                }

                await incomingInteraction.deferUpdate();

                const deleted = await RemoveTask(neo4jClient, {
                    taskId: ctx.state.task.id,
                    organizationUid: ctx.state.organizationUid,
                    viewerDiscordId: interaction.user.id,
                });

                if (deleted) {
                    await interaction.editReply({
                        content: TranslateFromContext(executionContext, `commands.create.task.messages.removed`, {
                            params: { id: ctx.state.task.id },
                        }),
                        components: [],
                    });
                } else {
                    await interaction.followUp({
                        content: TranslateFromContext(executionContext, `commands.create.task.errors.removeFailed`),
                        flags: MessageFlags.Ephemeral,
                    });
                }

                return true;
            })
            .next()
            .start();
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        Log.error(`Failed to create task: ${message}`, `CreateTask`, stack);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.create.task.errors.failed`, {
                params: { message },
            }),
        });
    }
}

async function __FetchTargetMessage(
    interaction: ChatInputCommandInteraction | MessageContextMenuCommandInteraction,
): Promise<Message | null> {
    try {
        if (`targetMessage` in interaction && typeof interaction.targetMessage !== `undefined`) {
            return interaction.targetMessage as Message;
        }

        const channel = interaction.channel;
        if (!channel || !(`messages` in channel)) {
            return null;
        }

        const reference = (interaction as any).message?.reference;
        if (!reference?.messageId) {
            return null;
        }

        return await channel.messages.fetch(reference.messageId);
    } catch {
        return null;
    }
}

/**
 * Build short description from message content
 * @param text string Full message content example Fix the bug in login flow
 * @returns string Short description for list views example Fix the bug
 */
function __BuildShortDescription(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) {
        return ``;
    }

    const firstLine = trimmed.split(/\r?\n/)[0] ?? ``;
    const sentenceMatch = firstLine.match(/^[\s\S]*?[.!?](?=\s|$)/);
    let candidate = (sentenceMatch?.[0] ?? firstLine).trim();

    const words = candidate.split(/\s+/).filter(Boolean);
    if (words.length > 5) {
        candidate = words.slice(0, 5).join(` `);
    }
    if (candidate.length > 32) {
        candidate = candidate.slice(0, 32).trim();
    }
    return candidate;
}
