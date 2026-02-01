import type { APIEmbedField, ActionRowBuilder, MessageActionRowComponentBuilder } from 'discord.js';

/**
 * Node within a hierarchical menu tree.
 * @property id string unique identifier. Example: 'settings'.
 * @property label string display label. Example: 'Settings'.
 * @property description string optional helper text shown in select menus. Example: 'Configure options'.
 * @property children MenuNode[] optional child menu nodes for navigation. Example: [{ id: 'audio', label: 'Audio' }].
 * @property fields APIEmbedField[] optional embed fields for rich context rendering. Example: [{ name: 'Info', value: 'Details' }].
 */
export interface MenuNode {
    id: string;
    label: string;
    description?: string;
    children?: MenuNode[];
    fields?: APIEmbedField[];
}

/**
 * Configuration for a hierarchical menu.
 * @property root MenuNode top-level node to render. Example: { id: 'root', label: 'Menu', children: [...] }.
 * @property title string optional heading shown above controls. Example: 'Select an option'.
 * @property description string optional guidance message. Example: 'Use buttons to navigate'.
 * @property emptyChildrenLabel string fallback text when a node has no children. Example: 'No options available'.
 * @property backLabel string override label for back navigation. Example: 'Previous'.
 * @property rootLabel string override label for returning home. Example: 'Home'.
 */
export interface MenuConfig {
    root: MenuNode;
    title?: string;
    description?: string;
    emptyChildrenLabel?: string;
    backLabel?: string;
    rootLabel?: string;
}

/**
 * Tracks where the user is within the menu tree.
 * @property path string[] ordered node ids from root to current. Example: ['root','settings','audio'].
 */
export interface MenuState {
    path: string[];
}

/**
 * Output of a menu render suitable for Discord messages.
 * @property content string message content to display. Example: 'Settings / Audio'.
 * @property components ActionRowBuilder<MessageActionRowComponentBuilder>[] action rows for buttons and select menus. Example: [ActionRowBuilder].
 * @property activeNode MenuNode node currently focused. Example: { id: 'audio', label: 'Audio' }.
 * @property breadcrumbs string[] readable path labels. Example: ['Menu','Settings','Audio'].
 */
export interface MenuRenderResult {
    content: string;
    components: ActionRowBuilder<MessageActionRowComponentBuilder>[];
    activeNode: MenuNode;
    breadcrumbs: string[];
}
