import {
    ActionRowBuilder,
    ButtonInteraction,
    StringSelectMenuInteraction,
    type MessageActionRowComponentBuilder,
} from 'discord.js';
import type { MenuConfig, MenuRenderResult, MenuState } from './MenuTypes.js';
import { MenuTreeNavigator } from './MenuTreeNavigator.js';
import { MenuCustomIdResolver } from './MenuCustomIdResolver.js';
import { MenuComponentBuilder } from './MenuComponentBuilder.js';

/**
 * @brief Renders a hierarchical menu into Discord components and handles navigation events
 */
export class MenuRenderer {
    private readonly _navigator: MenuTreeNavigator;
    private readonly _idResolver: MenuCustomIdResolver;
    private readonly _componentBuilder: MenuComponentBuilder;

    /**
     * @param config MenuConfig Menu configuration with root node and labels
     * @param customIdPrefix string Namespace prefix for component custom IDs
     *
     * @example
     * const renderer = new MenuRenderer(config, 'settings_menu');
     */
    public constructor(config: MenuConfig, customIdPrefix?: string) {
        const prefix = customIdPrefix ?? `menu`;
        this._navigator = new MenuTreeNavigator(config);
        this._idResolver = new MenuCustomIdResolver(prefix);
        this._componentBuilder = new MenuComponentBuilder(config, this._idResolver);
    }

    /**
     * @brief Build Discord components for the current menu state
     *
     * @param state MenuState Current navigation path
     * @returns MenuRenderResult Content and components to send or edit a message
     */
    public Render(state: MenuState): MenuRenderResult {
        const activeNode = this._navigator.ResolveNode(state.path);
        const breadcrumbs = this._navigator.BuildBreadcrumbs(state.path);
        const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

        const childButtonRow = this._componentBuilder.BuildChildButtonRow(activeNode);
        if (childButtonRow) {
            components.push(childButtonRow);
        }

        const childSelectRow = this._componentBuilder.BuildChildSelectRow(activeNode);
        if (childSelectRow) {
            components.push(childSelectRow);
        }

        components.push(this._componentBuilder.BuildNavigationRow(state.path));

        return {
            content: this._componentBuilder.BuildContent(activeNode, breadcrumbs),
            components,
            activeNode,
            breadcrumbs,
        };
    }

    /**
     * @brief Update menu state based on an interaction and return the new state
     *
     * @param interaction ButtonInteraction Discord interaction
     * @param state MenuState Current navigation path
     * @returns MenuState Updated path or original if not handled
     */
    public HandleInteraction(
        interaction: ButtonInteraction | StringSelectMenuInteraction,
        state: MenuState,
    ): MenuState {
        if (!this._idResolver.IsRelevant(interaction.customId)) {
            return state;
        }

        if (interaction.isButton()) {
            if (interaction.customId === this._idResolver.BackId()) {
                return { path: state.path.slice(0, -1) };
            }
            if (interaction.customId === this._idResolver.RootId()) {
                return { path: [] };
            }
            const childId = this._idResolver.ExtractChildId(interaction.customId);
            if (childId) {
                const nextNode = this._navigator.FindChild(this._navigator.ResolveNode(state.path), childId);
                if (!nextNode) {
                    return state;
                }
                return { path: [...state.path, childId] };
            }
            return state;
        }

        if (interaction.isStringSelectMenu() && interaction.customId === this._idResolver.SelectId()) {
            const selected = interaction.values[0];
            const nextNode = this._navigator.FindChild(this._navigator.ResolveNode(state.path), selected);
            if (!nextNode) {
                return state;
            }
            return { path: [...state.path, selected] };
        }

        return state;
    }
}
