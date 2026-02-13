import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    ComponentType,
} from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../Common/Type/Interaction.js';
import { Translate, TranslateFromContext } from '../Services/I18nService.js';

/** Button custom IDs for page navigation */
const TUTORIAL_PREV_ID = `tutorial_prev`; // previous page button
const TUTORIAL_NEXT_ID = `tutorial_next`; // next page button


/** Duration in milliseconds before the collector expires */
const COLLECTOR_TIMEOUT = 300_000; // 5 minutes

/**
 * Represents a single page in the tutorial embed sequence.
 */
interface ITutorialPage {
    /** Page title displayed as embed title. @example 'Getting Started' */
    title: string;

    /** Embed description content (markdown-safe). @example 'MPG System is a game management bot...' */
    content: string;

    /** Accent color for the embed sidebar. @example 0x89b4fa */
    color: number;
}

/**
 * Build the ordered array of tutorial pages.
 * Each page maps to one of the six tutorial sections.
 * @returns ITutorialPage[] All tutorial pages in display order.
 */
function __BuildTutorialPages(): ITutorialPage[] {
    return [
        {
            title: `Tutorial: Getting Started`,
            color: 0x89b4fa,
            content: [
                `**MPG System** is a game management bot. Each Discord server hosts one game. Players belong to organizations, which own game objects.`,
                ``,
                `**Creating a Game**`,
                `\`/create game name: My Campaign\``,
                `Registers a game entity for the server. Only one game per server.`,
                ``,
                `**Organizations**`,
                `Organizations are groups (factions, teams) that own game objects.`,
                `\`/organization create name: Northern Alliance\``,
                ``,
                `**User Scope Resolution**`,
                `Explicit org override > Stored default > First org > User scope`,
                `Set your default: \`/organization select uid: org_abc123\``,
                ``,
                `**View Game State**`,
                `\`/view game\` - shows name, turn, org, and description.`,
            ].join(`\n`),
        },
        {
            title: `Tutorial: Templates`,
            color: 0xa6e3a1,
            content: [
                `Templates are blueprints for game objects. They define parameters and actions.`,
                ``,
                `**Structure**: name, description, parameters[], actions[]`,
                ``,
                `**Parameters**: key (used in expressions), label, valueType (number/string/boolean), defaultValue`,
                ``,
                `**Actions**: key, label, trigger, priority, expressions[], enabled`,
                ``,
                `**Triggers**: \`onTurnAdvance\` | \`onManual\` | \`onCreate\` | \`onDestroy\``,
                ``,
                `**Web Editor**: \`http://localhost:PORT/editor\``,
                `Form-based editing with live JSON preview and validation.`,
                ``,
                `**Upload**: \`/manage template\` (attach JSON file)`,
                `**List**: \`/view template\``,
                ``,
                `**Merging**: Re-uploading same name triggers merge. Destructive changes (removed params, type changes) require confirmation.`,
            ].join(`\n`),
        },
        {
            title: `Tutorial: Objects`,
            color: 0xf9e2af,
            content: [
                `Objects are instances of templates, owned by an organization.`,
                `Each carries its own parameter values that evolve over turns.`,
                ``,
                `**Create**: \`/manage object\` - specify template, optional name`,
                `Objects start with default parameter values from the template.`,
                ``,
                `**View**: \`/view object id: obj_abc123\``,
                `Shows name, template type, org, and scoped description.`,
                ``,
                `**List**: \`/view objects\``,
                `Lists objects for your org. Filter by template:`,
                `\`/view objects template: Factory\``,
                ``,
                `**Parameters** evolve via action expressions during turns:`,
                `Turn 1: rawMaterials=100 -> action: -=20 -> 80`,
                `Turn 2: rawMaterials=80 -> action: -=20 -> 60`,
            ].join(`\n`),
        },
        {
            title: `Tutorial: Expression Language`,
            color: 0xcba6f7,
            content: [
                `Expressions are the math language used in actions.`,
                ``,
                `**Assignment**: \`param = expr\`, \`+=\`, \`-=\`, \`*=\`, \`/=\``,
                `**Arithmetic**: \`+ - * / % ^\` and \`(grouping)\``,
                `**Comparisons**: \`> < >= <= == !=\` (return 1 or 0)`,
                ``,
                `**Functions**: \`min(a,b)\` \`max(a,b)\` \`clamp(v,lo,hi)\` \`floor(x)\` \`ceil(x)\` \`abs(x)\` \`if(cond,then,else)\``,
                ``,
                `**Cross-Object Read**: \`@Mine.oreOutput\``,
                `Reads from first object of that template type.`,
                ``,
                `**Aggregates**: \`sum(@T.p)\` \`avg(@T.p)\` \`count(@T.p)\``,
                `Operate across all objects of a template.`,
                ``,
                `**Inline Targeting (Write)**:`,
                `\`@Mine.oreOutput -= 5\` modifies all Mine objects.`,
                `LHS is \`@Template.param\`, RHS uses own params.`,
            ].join(`\n`),
        },
        {
            title: `Tutorial: Turn Engine`,
            color: 0xf38ba8,
            content: [
                `The turn engine processes all objects when a turn advances.`,
                ``,
                `**Advance**: \`/manage turn advance\``,
                ``,
                `**Execution Order**:`,
                `1. Collect all game objects`,
                `2. Build cross-object state snapshot`,
                `3. Collect \`onTurnAdvance\` actions per object`,
                `4. Sort by priority (lower = first)`,
                `5. Evaluate expressions, queue remote writes`,
                `6. Persist all changes`,
                ``,
                `**Priority**: Lower number = executes first.`,
                `Priority 5 (gather) -> 10 (produce) -> 20 (distribute)`,
                ``,
                `**Snapshot**: Cross-refs read from pre-turn state.`,
                `In-flight mutations don't affect other reads.`,
                `Remote writes use last-write-wins dedup.`,
            ].join(`\n`),
        },
        {
            title: `Tutorial: Tasks & Descriptions`,
            color: 0x94e2d5,
            content: [
                `**Tasks** are work items tied to a game.`,
                ``,
                `**List**: \`/view task\``,
                `**Filter**: \`/view task turn: 5\` or \`/view task creator: @user\``,
                `**Detail**: \`/view task id: task_abc123\``,
                ``,
                `**Scoped Descriptions**`,
                `Any entity can have descriptions at three tiers:`,
                ``,
                `\`global\` - visible to everyone (lowest priority)`,
                `\`organization\` - visible to org members (medium)`,
                `\`user\` - visible to specific user (highest)`,
                ``,
                `Resolution: user > organization > global > none`,
                ``,
                `**Edit**: \`/create description id: obj_abc123\``,
                `Opens interactive text editor. Scope from your context.`,
            ].join(`\n`),
        },
    ];
}

export const data = new SlashCommandBuilder()
    .setName(`tutorial`)
    .setDescription(Translate(`commands.tutorial.description`))
    .addStringOption(option => {
        return option
            .setName(`topic`)
            .setDescription(Translate(`commands.tutorial.options.topic`))
            .setRequired(false)
            .addChoices(
                { name: `Getting Started`, value: `getting-started` },
                { name: `Templates`, value: `templates` },
                { name: `Objects`, value: `objects` },
                { name: `Expression Language`, value: `expressions` },
                { name: `Turn Engine`, value: `turn-engine` },
                { name: `Tasks & Descriptions`, value: `tasks-descriptions` },
            );
    });

export const permissionTokens: TokenSegmentInput[][] = [[`view`]];

/**
 * Execute the /tutorial command.
 * Shows paginated tutorial embeds with navigation buttons and a link to the web version.
 *
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when the tutorial display flow completes or times out
 * @example /tutorial
 * @example /tutorial topic: templates
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const pages = __BuildTutorialPages();
        const topicOption = interaction.options.getString(`topic`);

        /** Determine starting page index from topic option */
        const topicIndexMap: Record<string, number> = {
            'getting-started': 0,
            'templates': 1,
            'objects': 2,
            'expressions': 3,
            'turn-engine': 4,
            'tasks-descriptions': 5,
        };
        let currentPageIndex = topicOption ? (topicIndexMap[topicOption] ?? 0) : 0;

        const buildEmbed = (pageIndex: number): EmbedBuilder => {
            const page = pages[pageIndex];
            return new EmbedBuilder()
                .setTitle(page.title)
                .setColor(page.color)
                .setDescription(page.content)
                .setFooter({
                    text: TranslateFromContext(interaction.executionContext, `commands.tutorial.labels.pageIndicator`, {
                        params: {
                            index: String(pageIndex + 1),
                            total: String(pages.length),
                        },
                    }),
                });
        };

        const buildButtons = (pageIndex: number): ActionRowBuilder<ButtonBuilder> => {
            const previousButton = new ButtonBuilder()
                .setCustomId(TUTORIAL_PREV_ID)
                .setLabel(TranslateFromContext(interaction.executionContext, `commands.tutorial.actions.previous`))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(pageIndex === 0);

            const nextButton = new ButtonBuilder()
                .setCustomId(TUTORIAL_NEXT_ID)
                .setLabel(TranslateFromContext(interaction.executionContext, `commands.tutorial.actions.next`))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pageIndex === pages.length - 1);

            return new ActionRowBuilder<ButtonBuilder>().addComponents(previousButton, nextButton);
        };

        const replyMessage = await interaction.editReply({
            embeds: [buildEmbed(currentPageIndex)],
            components: [buildButtons(currentPageIndex)],
        });

        const collector = replyMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: COLLECTOR_TIMEOUT,
            filter: (buttonInteraction) => {
                return buttonInteraction.user.id === interaction.user.id;
            },
        });

        collector.on(`collect`, async(buttonInteraction) => {
            try {
                if (buttonInteraction.customId === TUTORIAL_PREV_ID && currentPageIndex > 0) {
                    currentPageIndex--;
                } else if (buttonInteraction.customId === TUTORIAL_NEXT_ID && currentPageIndex < pages.length - 1) {
                    currentPageIndex++;
                }

                await buttonInteraction.update({
                    embeds: [buildEmbed(currentPageIndex)],
                    components: [buildButtons(currentPageIndex)],
                });
            } catch(error) {
                const message = error instanceof Error ? error.message : String(error);
                await buttonInteraction.reply({
                    content: TranslateFromContext(interaction.executionContext, `commands.tutorial.errors.navigationFailed`, {
                        params: { message },
                    }),
                    flags: MessageFlags.Ephemeral,
                });
            }
        });

        collector.on(`end`, async() => {
            try {
                await interaction.editReply({
                    embeds: [buildEmbed(currentPageIndex)],
                    components: [],
                });
            } catch {
                // interaction may have been deleted
            }
        });
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.tutorial.errors.failed`, {
                params: { message },
            }),
        });
    }
}
