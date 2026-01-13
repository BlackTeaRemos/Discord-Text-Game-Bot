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
import { FetchTasksForViewer } from '../../Flow/Task/FetchTasksForViewer.js';
import { FindOrganizationForServer } from '../../Flow/Object/Organization/FindForServer.js';
import { neo4jClient } from '../../Setup/Neo4j.js';
import { flowManager } from '../../Common/Flow/Manager.js';
import { log } from '../../Common/Log.js';

const VIEW_TASK_PREV_ID = `view_task_prev`;
const VIEW_TASK_NEXT_ID = `view_task_next`;
const PAGE_SIZE = 10;

/**
 * Flow state for task list viewing
 */
interface ViewTaskState {
    tasks: TaskListItem[]; // all fetched tasks
    pageIndex: number; // current page index
    totalPages: number; // total page count
    turnNumber: number; // viewed turn number
    baseInteraction: ChatInputCommandInteraction; // original interaction
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

    const turnOption = interaction.options.getInteger(`turn`);
    const creatorOption = interaction.options.getUser(`creator`);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const games = await ListGamesForServer(serverId);
        const game = games[0];
        if (!game) {
            await interaction.editReply({
                content: `No game exists in this server`,
            });
            return;
        }

        const organization = await FindOrganizationForServer(serverId);
        if (!organization) {
            await interaction.editReply({
                content: `No organization found for this server`,
            });
            return;
        }

        const currentTurn = await GetGameCurrentTurn(game.uid);
        const targetTurn = turnOption ?? currentTurn;

        const tasks = await FetchTasksForViewer(neo4jClient, {
            organizationUid: organization.uid,
            viewerDiscordId: interaction.user.id,
            gameUid: game.uid,
            turnNumber: targetTurn,
            includeAll: true,
            allowOverride: true,
            targetDiscordId: creatorOption?.id ?? null,
            statuses: [],
        });

        if (tasks.length === 0) {
            await interaction.editReply({
                content: `No tasks found for turn ${targetTurn}`,
            });
            return;
        }

        const totalPages = Math.ceil(tasks.length / PAGE_SIZE);
        const initialState: ViewTaskState = {
            tasks,
            pageIndex: 0,
            totalPages,
            turnNumber: targetTurn,
            baseInteraction: interaction as unknown as ChatInputCommandInteraction,
        };

        await flowManager
            .builder(interaction.user.id, interaction, initialState)
            .step([VIEW_TASK_PREV_ID, VIEW_TASK_NEXT_ID], `view_task`)
            .prompt(async ctx => {
                await __RenderTaskList(ctx.state);
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
                await __RenderTaskList(ctx.state);
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
async function __RenderTaskList(state: ViewTaskState): Promise<void> {
    const startIndex = state.pageIndex * PAGE_SIZE;
    const pageTasks = state.tasks.slice(startIndex, startIndex + PAGE_SIZE);

    const lines = pageTasks.map(task => {
        const shortDescription = __ExtractWords(task.description, 5);
        return `\`${task.id}\` - ${shortDescription}`;
    });

    const embed = new EmbedBuilder()
        .setTitle(`Tasks - Turn ${state.turnNumber}`)
        .setDescription(lines.join(`\n`))
        .setColor(`Blue`)
        .setFooter({ text: `Page ${state.pageIndex + 1} of ${state.totalPages} (${state.tasks.length} total)` });

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
