/**
 * Describes a single renderable page for an object view.
 * @property title string | undefined Optional page title. Example: "Overview".
 * @property description string Required page body. Example: "A cooperative raid".
 * @property scopeLabel string | undefined Optional scope tag. Example: "Org scope".
 * @property imageUrl string | undefined Optional image to show per page. Example: "https://.../banner.png".
 * @property footer string | undefined Optional footer text. Example: "Last updated today".
 */
export interface ObjectViewPage {
    title?: string;
    description: string;
    scopeLabel?: string;
    imageUrl?: string;
    footer?: string;
}

/**
 * Describes the full object view model that will be rendered and paged.
 * @property id string Object identifier. Example: "game_123".
 * @property name string Primary display name. Example: "Galaxy League".
 * @property friendlyName string | undefined Secondary name. Example: "League".
 * @property imageUrl string | undefined Header image shown on all pages. Example: "https://.../cover.png".
 * @property color number | undefined Embed color integer. Example: 0x5865F2.
 * @property pages ObjectViewPage[] Ordered pages to render. Example: [{ description: "Page" }].
 */
export interface ObjectViewModel {
    id: string;
    name: string;
    friendlyName?: string;
    imageUrl?: string;
    color?: number;
    pages: ObjectViewPage[];
}

/**
 * Fetches a fresh view model at render time to keep data current.
 */
export type ObjectViewResolver = () => Promise<ObjectViewModel>;
