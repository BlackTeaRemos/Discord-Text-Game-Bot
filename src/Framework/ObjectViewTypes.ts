import type { APIEmbedField } from 'discord.js';

/**
 * Structured field rendered inside an embed page.
 * Wraps discord.js APIEmbedField for type safety.
 * @property name string Field header text. Example: "Status"
 * @property value string Field body text. Example: "Active"
 * @property inline boolean | undefined Render side-by-side when true. Example: true
 */
export interface ObjectViewField {
    name: string;
    value: string;
    inline?: boolean;
}

/**
 * Describes a single renderable page for an object view.
 * @property title string | undefined Optional page title. Example: "Overview"
 * @property description string Required page body. Example: "A cooperative raid"
 * @property fields ObjectViewField[] | undefined Structured embed fields. Example: [{ name: 'HP', value: '100', inline: true }]
 * @property scopeLabel string | undefined Optional scope tag. Example: "Org scope"
 * @property imageUrl string | undefined Optional large image per page. Example: "https://.../banner.png"
 * @property thumbnailUrl string | undefined Optional small thumbnail per page. Example: "https://.../icon.png"
 * @property footer string | undefined Optional footer text. Example: "Last updated today"
 * @property timestamp Date | undefined Optional timestamp rendered by Discord. Example: new Date()
 * @property selectOptions ObjectViewSelectOption[] | undefined Navigable select menu entries for this page
 */
export interface ObjectViewPage {
    title?: string;
    description: string;
    fields?: ObjectViewField[];
    scopeLabel?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    footer?: string;
    timestamp?: Date;
    selectOptions?: ObjectViewSelectOption[];
}

/**
 * Single option for a select menu on an object view page
 * @property label string Display label. Example: "Dragon's Lair"
 * @property value string Navigation target uid. Example: "obj_abc123"
 * @property description string | undefined Short description. Example: "Factory"
 */
export interface ObjectViewSelectOption {
    label: string;
    value: string;
    description?: string;
}

/**
 * Callback invoked when a user selects a relationship target to navigate to
 * @param targetUid string The uid of the selected object
 * @returns Promise<void>
 */
export type NavigationCallback = (targetUid: string) => Promise<void>;

/**
 * Describes the full object view model that will be rendered and paged.
 * @property id string Object identifier. Example: "game_123"
 * @property objectType string Type discriminator for theming. Example: "game"
 * @property name string Primary display name. Example: "Galaxy League"
 * @property friendlyName string | undefined Secondary name shown as author. Example: "League"
 * @property imageUrl string | undefined Header image shown on all pages. Example: "https://.../cover.png"
 * @property thumbnailUrl string | undefined Thumbnail shown on all pages. Example: "https://.../icon.png"
 * @property color number | undefined Embed color integer override. Themes provide default. Example: 0x5865F2
 * @property pages ObjectViewPage[] Ordered pages to render. Example: [{ description: "Page" }]
 */
export interface ObjectViewModel {
    id: string;
    objectType: string;
    name: string;
    friendlyName?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    color?: number;
    pages: ObjectViewPage[];
}

/**
 * Fetches a fresh view model at render time to keep data current.
 */
export type ObjectViewResolver = () => Promise<ObjectViewModel>;
