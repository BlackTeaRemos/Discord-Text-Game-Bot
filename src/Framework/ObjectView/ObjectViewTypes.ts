import type { APIEmbedField, AttachmentBuilder } from 'discord.js';

/**
 * @brief Structured field wrapping APIEmbedField for type safe embed page rendering
 */
export interface ObjectViewField {
    name: string; // Field header text
    value: string; // Field body text
    inline?: boolean; // Render side by side when true
}

/**
 * @brief Describes a single renderable page for an object view
 */
export interface ObjectViewPage {
    title?: string; // Optional page title
    description: string; // Required page body
    section?: string; // Section identifier for quick nav jump buttons
    fields?: ObjectViewField[]; // Structured embed fields
    scopeLabel?: string; // Optional scope tag
    imageUrl?: string; // Optional large image per page
    thumbnailUrl?: string; // Optional small thumbnail per page
    footer?: string; // Optional footer text
    timestamp?: Date; // Optional timestamp rendered by Discord
}

/**
 * @brief Describes the full object view model that will be rendered and paged
 */
export interface ObjectViewModel {
    id: string; // Object identifier
    objectType: string; // Type discriminator for theming
    name: string; // Primary display name
    friendlyName?: string; // Secondary name shown as author
    imageUrl?: string; // Header image shown on all pages
    thumbnailUrl?: string; // Thumbnail shown on all pages
    color?: number; // Embed color integer override
    pages: ObjectViewPage[]; // Ordered pages to render
    files?: AttachmentBuilder[]; // File attachments sent with the message
}

/**
 * @brief Fetches a fresh view model at render time to keep data current
 */
export type ObjectViewResolver = () => Promise<ObjectViewModel>;
