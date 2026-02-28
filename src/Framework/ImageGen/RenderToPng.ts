import type { SatoriElement } from './SatoriElement.js';
import { CARD_WIDTH, CARD_MAX_HEIGHT } from './CardTheme.js';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

/** Font entry for Satori text rendering */
interface SatoriFont {
    name: string;
    data: ArrayBuffer;
    weight: number;
    style: string;
}

/** Satori render function signature */
type SatoriRenderFn = (element: unknown, options: {
    width: number;
    height: number;
    fonts: SatoriFont[];
}) => Promise<string>;

/** resvg render result */
interface ResvgRenderResult {
    asPng(): Uint8Array;
}

/** resvg constructor type */
type ResvgConstructor = new (svg: string, options?: {
    fitTo?: { mode: string; value?: number };
}) => { render(): ResvgRenderResult };

/** resvg init function type */
type ResvgInitFn = (wasmSource: Promise<Response> | ArrayBuffer) => Promise<void>;

/** Cached Satori render function */
let _satoriRender: SatoriRenderFn | null = null;

/** Cached resvg constructor */
let _ResvgClass: ResvgConstructor | null = null;

/** Whether resvg WASM has been initialized */
let _resvgInitialized = false;

/**
 * Lazily import and cache the Satori render function
 *
 * @returns SatoriRenderFn Satori default export
 */
async function __loadSatori(): Promise<SatoriRenderFn> {
    if (!_satoriRender) {
        const mod = await import(`satori`) as { default: SatoriRenderFn };
        _satoriRender = mod.default;
    }
    return _satoriRender;
}

/**
 * Lazily import cache and initialize the resvg wasm module
 *
 * @returns ResvgConstructor Initialized Resvg class
 */
async function __loadResvg(): Promise<ResvgConstructor> {
    if (!_ResvgClass) {
        const mod = await import(`@resvg/resvg-wasm`) as {
            Resvg: ResvgConstructor;
            initWasm: ResvgInitFn;
        };
        _ResvgClass = mod.Resvg;
        if (!_resvgInitialized) {
            const nodeRequire = createRequire(import.meta.url);
            const wasmPath = nodeRequire.resolve(`@resvg/resvg-wasm/index_bg.wasm`);
            const wasmBuffer = await readFile(wasmPath);
            await mod.initWasm(wasmBuffer.buffer as ArrayBuffer);
            _resvgInitialized = true;
        }
    }
    return _ResvgClass;
}

/**
 * Font data used by Satori for text rendering loaded once and cached for subsequent renders
 */
let _interFontCache: ArrayBuffer | null = null;
let _quanticoRegularCache: ArrayBuffer | null = null;
let _quanticoBoldCache: ArrayBuffer | null = null;

/**
 * Load the Inter font from the fontsource inter package
 *
 * @returns ArrayBuffer or null Font data buffer or null
 */
async function __loadInterFont(): Promise<ArrayBuffer | null> {
    if (_interFontCache) {
        return _interFontCache;
    }
    try {
        const nodeRequire = createRequire(import.meta.url);
        const fontPath = nodeRequire.resolve(`@fontsource/inter/files/inter-latin-400-normal.woff`);
        const fontBuffer = await readFile(fontPath);
        _interFontCache = fontBuffer.buffer as ArrayBuffer;
        return _interFontCache;
    } catch {
        return null;
    }
}

/**
 * Load Quantico Regular 400 font from the fontsource quantico package
 *
 * @returns ArrayBuffer or null Font data buffer or null
 */
async function __loadQuanticoRegular(): Promise<ArrayBuffer | null> {
    if (_quanticoRegularCache) {
        return _quanticoRegularCache;
    }
    try {
        const nodeRequire = createRequire(import.meta.url);
        const fontPath = nodeRequire.resolve(`@fontsource/quantico/files/quantico-latin-400-normal.woff`);
        const fontBuffer = await readFile(fontPath);
        _quanticoRegularCache = fontBuffer.buffer as ArrayBuffer;
        return _quanticoRegularCache;
    } catch {
        return null;
    }
}

/**
 * Load Quantico Bold 700 font from the fontsource quantico package
 *
 * @returns ArrayBuffer or null Font data buffer or null
 */
async function __loadQuanticoBold(): Promise<ArrayBuffer | null> {
    if (_quanticoBoldCache) {
        return _quanticoBoldCache;
    }
    try {
        const nodeRequire = createRequire(import.meta.url);
        const fontPath = nodeRequire.resolve(`@fontsource/quantico/files/quantico-latin-700-normal.woff`);
        const fontBuffer = await readFile(fontPath);
        _quanticoBoldCache = fontBuffer.buffer as ArrayBuffer;
        return _quanticoBoldCache;
    } catch {
        return null;
    }
}

/**
 * Load all available fonts for Satori rendering
 *
 * @returns SatoriFont array Array of loaded font entries
 */
async function __loadAllFonts(): Promise<SatoriFont[]> {
    const [interData, quanticoRegularData, quanticoBoldData] = await Promise.all([
        __loadInterFont(),
        __loadQuanticoRegular(),
        __loadQuanticoBold(),
    ]);

    const fonts: SatoriFont[] = [];

    if (interData) {
        fonts.push({ name: `Inter`, data: interData, weight: 400, style: `normal` });
    }

    if (quanticoRegularData) {
        fonts.push({ name: `Quantico`, data: quanticoRegularData, weight: 400, style: `normal` });
    }

    if (quanticoBoldData) {
        fonts.push({ name: `Quantico`, data: quanticoBoldData, weight: 700, style: `normal` });
    }

    return fonts;
}

/**
 * Render a Satori element tree to a PNG buffer via Satori SVG then resvg wasm
 *
 * @param element SatoriElement Root element tree from CardLayout
 * @param width number Image width in pixels defaulting to CARD_WIDTH
 * @param maxHeight number Maximum height in pixels defaulting to CARD_MAX_HEIGHT
 * @returns Buffer PNG image as a NodeJS Buffer
 *
 * @example
 * const tree = BuildCardLayout({ detail, ... });
 * const png = await RenderToPng(tree);
 */
export async function RenderToPng(
    element: SatoriElement,
    width: number = CARD_WIDTH,
    maxHeight: number = CARD_MAX_HEIGHT,
): Promise<Buffer> {
    const [satoriRender, ResvgClass, fonts] = await Promise.all([
        __loadSatori(),
        __loadResvg(),
        __loadAllFonts(),
    ]);

    // Satori renders at maxHeight canvas then we crop to actual content
    const rawSvg = await satoriRender(element as unknown, {
        width,
        height: maxHeight,
        fonts,
    });

    // Crop the SVG viewport to the actual card content height via first rect element bounds
    const croppedSvg = __cropSvgToContent(rawSvg, width);

    // resvg converts cropped SVG to PNG
    const resvgInstance = new ResvgClass(croppedSvg, {
        fitTo: {
            mode: `width`,
            value: width,
        },
    });
    const pngData = resvgInstance.render();
    return Buffer.from(pngData.asPng());
}

/**
 * Crop the SVG viewport to match actual card content height using the first rect element as content bounds
 *
 * @param svg string Raw SVG output from Satori
 * @param width number Card width for viewBox replacement
 * @returns string SVG with height and viewBox cropped to content bounds
 */
function __cropSvgToContent(svg: string, width: number): string {
    // Match the first rect with a height attribute as the root element background
    const rectHeightMatch = svg.match(/<rect[^>]*?height="([\d.]+)"[^>]*?>/);
    if (!rectHeightMatch || !rectHeightMatch[1]) {
        return svg;
    }

    const contentHeight = Math.ceil(parseFloat(rectHeightMatch[1]));
    if (contentHeight <= 0 || isNaN(contentHeight)) {
        return svg;
    }

    // Replace root SVG height attribute
    let cropped = svg.replace(
        /(<svg[^>]*?)height="[\d.]+"/,
        `$1height="${contentHeight}"`,
    );

    // Replace viewBox to match
    cropped = cropped.replace(
        /viewBox="0 0 [\d.]+ [\d.]+"/,
        `viewBox="0 0 ${width} ${contentHeight}"`,
    );

    return cropped;
}
