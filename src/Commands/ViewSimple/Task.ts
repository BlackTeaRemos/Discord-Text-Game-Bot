import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import type { TaskListItem } from '../../Domain/Task.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { GetGameCurrentTurn } from '../../Flow/Object/Game/Turn.js';
import { FetchTasksForViewer } from '../../Flow/Task/fetchTasksForViewer.js';
import { FetchTaskById } from '../../Flow/Task/FetchTaskById.js';
import { UpdateTaskStatus } from '../../Flow/Task/updateTaskStatus.js';
import { ResolveStatusesForGroup } from '../../Flow/Task/ResolveStatusesForGroup.js';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { flowManager } from '../../Common/Flow/Manager.js';
import { log } from '../../Common/Log.js';
import { resolve } from '../../Common/Permission/index.js';
import type { IFlowMember } from '../../Common/Type/FlowContext.js';
import {
    ResolveExecutionOrganization,
    ResolveOrganization,
} from '../../Flow/Object/Organization/index.js';

const VIEW_TASK_PREV_ID = `view_task_prev`;
const VIEW_TASK_NEXT_ID = `view_task_next`;
const VIEW_TASK_FINISH_ID = `view_task_finish`;
const VIEW_TASK_CANCEL_ID = `view_task_cancel`;
const PAGE_SIZE = 10;

/**
 * Flow state for task list viewing
 */
interface ViewTaskState {
    tasks: TaskListItem[]; // all fetched tasks
    pageIndex: number; // current page index
    totalPages: number; // total page count
    baseInteraction: ChatInputCommandInteraction; // original interaction
    organizationName: string; // execution organization label
}

/**
 * Flow state for task detail viewing
 */
interface ViewTaskDetailState {
    task: TaskListItem; // current task item
    baseInteraction: ChatInputCommandInteraction; // original interaction
    organizationName: string; // execution organization label
}

/**
 * List tasks for current turn with paging
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when view is displayed
 */
export async function ExecuteViewTask(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const serverId = interaction.guildId;
    if (!serverId) {
        await interaction.reply({
            content: `This command must be used in a server`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const taskIdOption = interaction.options.getString(`id`)?.trim();
    const turnOption = interaction.options.getInteger(`turn`);
    const statusOption = interaction.options.getString(`status`)?.trim();
    const creatorOption = interaction.options.getUser(`creator`);
    const requestedOrganizationUid = interaction.options.getString(`organization`)?.trim() || null; // optional org override

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        let allowOverride = false;
        const executionOrganization = await ResolveExecutionOrganization(
            interaction.user.id,
            requestedOrganizationUid,
        ); // resolved execution scope

        if (executionOrganization.scopeType === `organization` && executionOrganization.organizationUid) {
            const organizationPermission = await ResolveOrganization({
                context: {
                    organizationUid: executionOrganization.organizationUid,
                    userId: interaction.user.id,
                    action: `view_tasks`,
                },
                skipApproval: false,
            });

            if (!organizationPermission.allowed) {
                await interaction.editReply({
                    content: `Permission denied (${executionOrganization.organizationName}).`,
                });
                return;
            }
        } else {
            const resolution = await resolve([`user:${interaction.user.id}:view_tasks`], {
                member: await interaction.guild?.members.fetch(interaction.user.id).then(m => {
                    return m ? { id: m.id, guildId: m.guild.id, permissions: m.permissions } as any : null;
                }),
                permissions: {
                    [`user:${interaction.user.id}:view_tasks`]: `allowed`,
                },
            });
            if (!resolution.success) {
                await interaction.editReply({
                    content: `Permission denied (User).`,
                });
                return;
            }
        }

        try {
            const member: IFlowMember = {
                id: interaction.user.id,
                guildId: interaction.guildId ?? undefined,
                roles: [],
            };

            const options = Object.fromEntries(
                (Array.isArray(interaction.options?.data) ? interaction.options.data : []).map((option: any) => {
                    return [option.name, option.value];
                }),
            );

            const isAdmin = Boolean(interaction.memberPermissions?.has(`Administrator`));
            const outcome = await resolve([`task:view:all`], {
                context: {
                    commandName: interaction.commandName,
                    userId: interaction.user.id,
                    guildId: interaction.guildId ?? undefined,
                    options,
                    isAdministrator: isAdmin,
                },
                member,
                skipApproval: false,
            });

            allowOverride = outcome.success;
        } catch (error) {
            log.warning(`Failed to resolve task:view:all: ${String(error)}`, `ViewTask`);
        } finally {
            // no cleanup needed
        }

        if (taskIdOption) {
            await __ShowTaskDetail(
                interaction as unknown as ChatInputCommandInteraction,
                taskIdOption,
                allowOverride,
                executionOrganization.organizationUid,
                executionOrganization.organizationName,
            );
            return;
        }

        const isTasksCommand = interaction.commandName === `tasks`;
        const needsTurn = isTasksCommand || turnOption !== null;
        let targetTurn: number | null = null;
        let gameUid: string | null = null;

        if (needsTurn) {
            const games = await ListGamesForServer(serverId);
            const game = games[0];
            if (!game) {
                await interaction.editReply({
                    content: `No game exists in this server`,
                });
                return;
            }

            const currentTurn = await GetGameCurrentTurn(game.uid);
            targetTurn = turnOption ?? currentTurn;
            gameUid = game.uid;
        }

        const statusGroup = statusOption || (isTasksCommand ? `todo` : `all`);
        const statuses = __ResolveStatusGroup(statusGroup);

        const tasks = await FetchTasksForViewer(neo4jClient, {
            organizationUid: executionOrganization.organizationUid,
            viewerDiscordId: interaction.user.id,
            gameUid,
            turnNumber: targetTurn,
            includeAll: allowOverride,
            allowOverride,
            targetDiscordId: creatorOption?.id ?? null,
            statuses,
        });

        if (tasks.length === 0) {
            await interaction.editReply({
                content: `No tasks found`,
            });
            return;
        }

        const totalPages = Math.ceil(tasks.length / PAGE_SIZE);
        const initialState: ViewTaskState = {
            tasks,
            pageIndex: 0,
            totalPages,
            baseInteraction: interaction as unknown as ChatInputCommandInteraction,
            organizationName: executionOrganization.organizationName,
        };

        await flowManager
            .builder(interaction.user.id, interaction, initialState)
            .step([VIEW_TASK_PREV_ID, VIEW_TASK_NEXT_ID], `view_task`)
            .prompt(async ctx => {
                await __RenderTaskList(ctx.state, ctx.state.organizationName);
            })
            .onInteraction(async (ctx, incomingInteraction) => {
                if (!incomingInteraction.isButton()) {
                    return false;
                }

                if (incomingInteraction.customId === VIEW_TASK_PREV_ID) {
                    ctx.state.pageIndex = Math.max(0, ctx.state.pageIndex - 1);
                } else if (incomingInteraction.customId === VIEW_TASK_NEXT_ID) {
                    ctx.state.pageIndex = Math.min(ctx.state.totalPages - 1, ctx.state.pageIndex + 1);
                }

                await incomingInteraction.deferUpdate();
                await __RenderTaskList(ctx.state, ctx.state.organizationName);
                return false;
            })
            .next()
            .start();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to view tasks`, message, `ViewTask`);
        await interaction.editReply({
            content: `Failed to view tasks: ${message}`,
        });
    }
}

/**
 * Render paginated task list embed
 * @param state ViewTaskState Current flow state
 * @returns Promise<void> Resolves when reply is updated
 */
async function __RenderTaskList(state: ViewTaskState, organizationName: string): Promise<void> {
    const startIndex = state.pageIndex * PAGE_SIZE;
    const pageTasks = state.tasks.slice(startIndex, startIndex + PAGE_SIZE);

    const lines = pageTasks.map(task => {
        const shortDescription = __ResolveShortDescription(task);
        const emoji = __ResolveStatusEmoji(task.status);
        return `${emoji}\n${shortDescription || `No short description`}\n\`${task.id}\``;
    });

    const embed = new EmbedBuilder()
        .setTitle(`Tasks`)
        .setDescription(lines.join(`\n\n`))
        .setColor(`Blue`)
        .setFooter({ text: `Page ${state.pageIndex + 1} of ${state.totalPages} (${state.tasks.length} total)` })
        .addFields({ name: `Org`, value: organizationName || `User`, inline: true });

    const prevButton = new ButtonBuilder()
        .setCustomId(VIEW_TASK_PREV_ID)
        .setLabel(`Previous`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(state.pageIndex === 0);

    const nextButton = new ButtonBuilder()
        .setCustomId(VIEW_TASK_NEXT_ID)
        .setLabel(`Next`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(state.pageIndex >= state.totalPages - 1);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton);

    await state.baseInteraction.editReply({
        embeds: [embed],
        components: [row],
    });
}

/**
 * Render a single task detail view
 * @param state ViewTaskDetailState Current detail state
 * @returns Promise<void> Resolves when reply is updated
 */
async function __RenderTaskDetail(state: ViewTaskDetailState, organizationName: string): Promise<void> {
    const task = state.task;
    const embed = new EmbedBuilder()
        .setTitle(`Task ${task.id}`)
        .setDescription(task.description || `No description`)
        .setColor(`Blue`)
        .addFields([
            { name: `Status`, value: String(task.status), inline: true },
            { name: `Short`, value: task.shortDescription || `None`, inline: true },
            { name: `Org`, value: organizationName || `User`, inline: true },
        ]);

    const finishButton = new ButtonBuilder()
        .setCustomId(VIEW_TASK_FINISH_ID)
        .setLabel(`Finish`)
        .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
        .setCustomId(VIEW_TASK_CANCEL_ID)
        .setLabel(`Cancel`)
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(finishButton, cancelButton);

    await state.baseInteraction.editReply({
        embeds: [embed],
        components: [row],
    });
}

/**
 * Show task detail and handle status updates
 * @param interaction ChatInputCommandInteraction Base interaction
 * @param taskId string Task id to display example task_123
 * @returns Promise<void> Resolves when detail flow starts
 */
async function __ShowTaskDetail(
    interaction: ChatInputCommandInteraction,
    taskId: string,
    allowOverride: boolean,
    organizationUid: string | null,
    organizationName: string,
): Promise<void> {
    const task = await FetchTaskById(neo4jClient, {
        taskId,
        organizationUid: organizationUid ?? ``,
        viewerDiscordId: interaction.user.id,
        allowOverride,
    });

    if (!task) {
        await interaction.editReply({
            content: `Task not found or access denied`,
        });
        return;
    }

        const initialState: ViewTaskDetailState = {
        task,
        baseInteraction: interaction,
            organizationName,
    };

    await flowManager
        .builder(interaction.user.id, interaction, initialState)
        .step([VIEW_TASK_FINISH_ID, VIEW_TASK_CANCEL_ID], `view_task_detail`)
        .prompt(async ctx => {
            await __RenderTaskDetail(ctx.state, ctx.state.organizationName);
        })
        .onInteraction(async (ctx, incomingInteraction) => {
            if (!incomingInteraction.isButton()) {
                return false;
            }

            let nextStatus: string | null = null;
            if (incomingInteraction.customId === VIEW_TASK_FINISH_ID) {
                nextStatus = `complete`;
            } else if (incomingInteraction.customId === VIEW_TASK_CANCEL_ID) {
                nextStatus = `failed`;
            }

            if (!nextStatus) {
                return false;
            }

            await incomingInteraction.deferUpdate();

            const updated = await UpdateTaskStatus(neo4jClient, {
                taskId: ctx.state.task.id,
                organizationUid: organizationUid ?? ``,
                viewerDiscordId: interaction.user.id,
                status: nextStatus as any,
                allowOverride,
            });

            if (!updated) {
                await interaction.followUp({
                    content: `Failed to update task status`,
                    flags: MessageFlags.Ephemeral,
                });
                return false;
            }

            ctx.state.task = updated;
            await __RenderTaskDetail(ctx.state, ctx.state.organizationName);
            return false;
        })
        .next()
        .start();
}

/**
 * Extract first N words from text
 * @param text string Source text
 * @param wordCount number Number of words to extract
 * @returns string Extracted words with ellipsis if truncated
 */
function __ExtractWords(text: string, wordCount: number): string {
    const words = text.trim().split(/\s+/);
    const extracted = words.slice(0, wordCount).join(` `);
    return words.length > wordCount ? `${extracted}...` : extracted;
}

/**
 * Resolve statuses for a status group
 * @param statusGroup string Status group value example todo
 * @returns string[] Status list example ['incomplete','in_progress']
 */
function __ResolveStatusGroup(statusGroup: string): string[] {
    const normalized = (statusGroup ?? ``).trim().toLowerCase();
    if (!normalized || normalized === `all`) {
        return [];
    }
    return ResolveStatusesForGroup(normalized);
}

/**
 * Resolve short description for list output
 * @param task TaskListItem Task item to format example { shortDescription: 'Fix bug' }
 * @returns string Short description value example Fix bug
 */
function __ResolveShortDescription(task: TaskListItem): string {
    const stored = task.shortDescription?.trim();
    if (stored) {
        return stored;
    }
    return __ExtractWords(task.description ?? ``, 5);
}

/**
 * Map task status to emoji
 * @param status string Task status value example complete
 * @returns string Emoji marker example 🟢
 */
function __ResolveStatusEmoji(status: string): string {
    const normalized = (status ?? ``).trim().toLowerCase();
    if (normalized === `complete` || normalized === `completed`) {
        return `🟢`;
    }
    if (normalized === `failed` || normalized === `canceled` || normalized === `cancelled`) {
        return `🔴`;
    }
    return `🟡`;
}
