import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    type MessageActionRowComponentBuilder,
} from 'discord.js';
import type { MenuConfig, MenuNode } from './MenuTypes.js';
import { Translate } from '../../Services/I18nService.js';
import { MenuCustomIdResolver } from './MenuCustomIdResolver.js';

/**
 * Builds Discord ActionRow components for menu rendering
 * Pure component factory with no state management or interaction handling
 */
export class MenuComponentBuilder {
    private readonly _config: MenuConfig;
    private readonly _idResolver: MenuCustomIdResolver;

    /**
     * @param config MenuConfig Menu configuration for labels and fallbacks
     * @param idResolver MenuCustomIdResolver Custom ID resolver for component IDs
     *
     * @example
     * const builder = new MenuComponentBuilder(config, idResolver);
     */
    constructor(config: MenuConfig, idResolver: MenuCustomIdResolver) {
        this._config = config;
        this._idResolver = idResolver;
    }

    /**
     * Build a button row for the first 3 child nodes of the active node
     * Returns null if the node has no children
     *
     * @param activeNode MenuNode Current menu node
     * @returns ActionRowBuilder or null Button row or null when no children exist
     */
    public BuildChildButtonRow(
        activeNode: MenuNode,
    ): ActionRowBuilder<MessageActionRowComponentBuilder> | null {
        const children = activeNode.children ?? [];
        if (children.length === 0) {
            return null;
        }
        const buttons = children.slice(0, 3).map((child) => {
            return new ButtonBuilder()
                .setCustomId(this._idResolver.ChildId(child.id))
                .setLabel(child.label)
                .setStyle(ButtonStyle.Primary);
        });
        return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(...buttons);
    }

    /**
     * Build a select menu row for nodes with more than 3 children
     * Returns null if the node has 3 or fewer children
     *
     * @param activeNode MenuNode Current menu node
     * @returns ActionRowBuilder or null Select row or null when not needed
     */
    public BuildChildSelectRow(
        activeNode: MenuNode,
    ): ActionRowBuilder<MessageActionRowComponentBuilder> | null {
        const children = activeNode.children ?? [];
        if (children.length <= 3) {
            return null;
        }
        const select = new StringSelectMenuBuilder()
            .setCustomId(this._idResolver.SelectId())
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

    /**
     * Build the back and root navigation button row
     * Both buttons are disabled when at root level with empty path
     *
     * @param path string array Current navigation path
     * @returns ActionRowBuilder Navigation button row
     */
    public BuildNavigationRow(path: string[]): ActionRowBuilder<MessageActionRowComponentBuilder> {
        const backButton = new ButtonBuilder()
            .setCustomId(this._idResolver.BackId())
            .setLabel(this._config.backLabel ?? Translate(`menuRenderer.back`))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(path.length === 0);

        const rootButton = new ButtonBuilder()
            .setCustomId(this._idResolver.RootId())
            .setLabel(this._config.rootLabel ?? Translate(`menuRenderer.root`))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(path.length === 0);

        return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(backButton, rootButton);
    }

    /**
     * Build the content text with title and breadcrumbs and node description
     *
     * @param activeNode MenuNode Current node for description
     * @param breadcrumbs string array Breadcrumb labels
     * @returns string Formatted content string
     */
    public BuildContent(activeNode: MenuNode, breadcrumbs: string[]): string {
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
}
