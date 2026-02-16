import type { ObjectDetail } from '../../Flow/Object/FetchObjectDetail.js';
import { ResolveObjectViewTheme } from '../ObjectViewThemeRegistry.js';
import { IntColorToCss } from './CardTheme.js';
import { BuildCardLayout } from './CardLayout.js';
import type { CardLayoutOptions } from './CardLayout.js';
import { RenderToPng } from './RenderToPng.js';

/**
 * Options for rendering an object card image
 * @property detail ObjectDetail Full object detail payload
 * @property objectType string Type discriminator for theming. Example: 'game'
 * @property description string | null Object description text
 * @property typeLabel string | undefined Human-readable type label override
 */
export interface RenderObjectCardOptions {
    detail: ObjectDetail;
    objectType: string;
    description: string | null;
    typeLabel?: string;
}

/**
 * Render a complete object card as a PNG image buffer
 * Resolves theme from the object type, builds the card layout, and renders to PNG
 *
 * @param options RenderObjectCardOptions Data and config for the card
 * @returns Promise<Buffer> PNG image buffer ready for Discord AttachmentBuilder
 *
 * @example
 * const png = await RenderObjectCard({
 *     detail: await FetchObjectDetail('game_abc'),
 *     objectType: 'game',
 *     description: 'A cooperative space exploration game',
 * });
 * const attachment = new AttachmentBuilder(png, { name: 'card.png' });
 */
export async function RenderObjectCard(options: RenderObjectCardOptions): Promise<Buffer> {
    const { detail, objectType, description, typeLabel } = options;
    const theme = ResolveObjectViewTheme(objectType);

    const layoutOptions: CardLayoutOptions = {
        detail,
        accentColor: IntColorToCss(theme.color),
        accentEmoji: theme.accentEmoji,
        objectType: typeLabel ?? objectType,
        description,
    };

    const elementTree = BuildCardLayout(layoutOptions);
    return RenderToPng(elementTree);
}
