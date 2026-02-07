import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder,
    type MessageActionRowComponentBuilder,
} from 'discord.js';
import type { MenuConfig, MenuNode, MenuRenderResult, MenuState } from './MenuTypes.js';
import { Translate } from '../Services/I18nService.js';
import { MenuTreeNavigator } from './MenuTreeNavigator.js';

/**
 * Renders a hierarchical menu into Discord components and handles navigation events.
 */
export class MenuRenderer {
    private readonly _config: MenuConfig;
    private readonly _customIdPrefix: string;
    private readonly _navigator: MenuTreeNavigator;

    public constructor(config: MenuConfig, customIdPrefix?: string) {
        this._config = config;
        this._customIdPrefix = customIdPrefix ?? `menu`;
        this._navigator = new MenuTreeNavigator(config);
    }

    /**
     * Build Discord components for the current menu state.
     * @param state MenuState current navigation path. Example: { path: ['root','settings'] }.
     * @returns MenuRenderResult content and components to send or edit a message.
     */
    public Render(state: MenuState): MenuRenderResult {
        const activeNode = this._navigator.ResolveNode(state.path);
        const breadcrumbs = this._navigator.BuildBreadcrumbs(state.path);
        const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

        const childButtonRow = this.__buildChildButtonRow(activeNode);
        if (childButtonRow) {
            components.push(childButtonRow);
        }

        const childSelectRow = this.__buildChildSelectRow(activeNode);
        if (childSelectRow) {
            components.push(childSelectRow);
        }

        components.push(this.__buildNavigationRow(state.path));

        return {
            content: this.__buildContent(activeNode, breadcrumbs),
            components,
            activeNode,
            breadcrumbs,
        };
    }

    /**
     * Update menu state based on an interaction and return the new state.
     * @param interaction ButtonInteraction | StringSelectMenuInteraction Discord interaction.
     * @param state MenuState current navigation path.
     * @returns MenuState updated path or original if not handled.
     */
    public HandleInteraction(
        interaction: ButtonInteraction | StringSelectMenuInteraction,
        state: MenuState,
    ): MenuState {
        if (!this.__isRelevant(interaction.customId)) {
            return state;
        }

        if (interaction.isButton()) {
            if (interaction.customId === this.__backId()) {
                return { path: state.path.slice(0, -1) };
            }
            if (interaction.customId === this.__rootId()) {
                return { path: [] };
            }
            const childId = this.__extractChildId(interaction.customId);
            if (childId) {
                const nextNode = this._navigator.FindChild(this._navigator.ResolveNode(state.path), childId);
                if (!nextNode) {
                    return state;
                }
                return { path: [...state.path, childId] };
            }
            return state;
        }

        if (interaction.isStringSelectMenu() && interaction.customId === this.__selectId()) {
            const selected = interaction.values[0];
            const nextNode = this._navigator.FindChild(this._navigator.ResolveNode(state.path), selected);
            if (!nextNode) {
                return state;
            }
            return { path: [...state.path, selected] };
        }

        return state;
    }

    private __buildContent(activeNode: MenuNode, breadcrumbs: string[]): string {
        const title = this._config.title ?? `Menu`;
        const guidance = this._config.description ?? ``;
        const breadcrumbText = breadcrumbs.join(` / `);
        const nodeDescription = activeNode.description ?? ``;
        const base = `${title}: ${breadcrumbText}`.trim();
        if (guidance && nodeDescription) {
            return `${base}\n${guidance}\n${nodeDescription}`;
        }
        if (guidance) {
            return `${base}\n${guidance}`;
        }
        if (nodeDescription) {
            return `${base}\n${nodeDescription}`;
        }
        return base;
    }

    private __buildChildButtonRow(
        activeNode: MenuNode,
    ): ActionRowBuilder<MessageActionRowComponentBuilder> | null {
        const children = activeNode.children ?? [];
        if (children.length === 0) {
            return null;
        }
        const buttons = children.slice(0, 3).map((child) => {
            return new ButtonBuilder()
                .setCustomId(this.__childId(child.id))
                .setLabel(child.label)
                .setStyle(ButtonStyle.Primary);
        });
        return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(...buttons);
    }

    private __buildChildSelectRow(
        activeNode: MenuNode,
    ): ActionRowBuilder<MessageActionRowComponentBuilder> | null {
        const children = activeNode.children ?? [];
        if (children.length <= 3) {
            return null;
        }
        const select = new StringSelectMenuBuilder()
            .setCustomId(this.__selectId())
            .setPlaceholder(Translate(`menuRenderer.chooseOption`))
            .addOptions(
                ...children.map((child) => {
                    const option = new StringSelectMenuOptionBuilder()
                        .setLabel(child.label)
                        .setValue(child.id);
                    if (child.description) {
                        option.setDescription(child.description);
                    }
                    return option;
                }),
            );
        return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(select);
    }

    private __buildNavigationRow(path: string[]): ActionRowBuilder<MessageActionRowComponentBuilder> {
        const backButton = new ButtonBuilder()
            .setCustomId(this.__backId())
            .setLabel(this._config.backLabel ?? Translate(`menuRenderer.back`))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(path.length === 0);

        const rootButton = new ButtonBuilder()
            .setCustomId(this.__rootId())
            .setLabel(this._config.rootLabel ?? Translate(`menuRenderer.root`))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(path.length === 0);

        return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(backButton, rootButton);
    }

    private __childId(childId: string): string {
        return `${this._customIdPrefix}:child:${childId}`;
    }

    private __backId(): string {
        return `${this._customIdPrefix}:back`;
    }

    private __rootId(): string {
        return `${this._customIdPrefix}:root`;
    }

    private __selectId(): string {
        return `${this._customIdPrefix}:select`;
    }

    private __extractChildId(customId: string): string | null {
        const match = customId.match(`${this._customIdPrefix}:child:(.+)`);
        if (!match || match.length < 2) {
            return null;
        }
        return match[1];
    }

    private __isRelevant(customId: string): boolean {
        return customId.startsWith(this._customIdPrefix);
    }
}
