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
 * @returns Promise<SatoriRenderFn> Satori default export
 */
async function __loadSatori(): Promise<SatoriRenderFn> {
    if (!_satoriRender) {
        const mod = await import(`satori`) as { default: SatoriRenderFn };
        _satoriRender = mod.default;
    }
    return _satoriRender;
}

/**
 * Lazily import, cache, and initialize the resvg-wasm module
 *
 * @returns Promise<ResvgConstructor> Initialized Resvg class
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
 * Font data used by Satori for text rendering
 * Loaded once and cached for subsequent renders
 */
let _fontDataCache: ArrayBuffer | null = null;

/**
 * Load the Inter font from the @fontsource/inter package in node_modules
 * Resolved via createRequire for compatibility with both Node.js and Bun
 *
 * @returns Promise<ArrayBuffer | null> Font data buffer or null
 */
async function __loadFont(): Promise<ArrayBuffer | null> {
    if (_fontDataCache) {
        return _fontDataCache;
    }
    try {
        const nodeRequire = createRequire(import.meta.url);
        const fontPath = nodeRequire.resolve(`@fontsource/inter/files/inter-latin-400-normal.woff`);
        const fontBuffer = await readFile(fontPath);
        _fontDataCache = fontBuffer.buffer as ArrayBuffer;
        return _fontDataCache;
    } catch {
        return null;
    }
}

/**
 * Render a Satori element tree to a PNG buffer
 * Pipeline: element tree -> Satori SVG -> resvg-wasm PNG
 *
 * @param element SatoriElement Root element tree from CardLayout
 * @param width number Image width in pixels, defaults to CARD_WIDTH
 * @param maxHeight number Maximum height in pixels, defaults to CARD_MAX_HEIGHT
 * @returns Promise<Buffer> PNG image as Node.js Buffer
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
    const [satoriRender, ResvgClass, fontData] = await Promise.all([
        __loadSatori(),
        __loadResvg(),
        __loadFont(),
    ]);

    const fonts: SatoriFont[] = [];
    if (fontData) {
        fonts.push({
            name: `Inter`,
            data: fontData,
            weight: 400,
            style: `normal`,
        });
    }

    // Satori renders the element tree to SVG string
    const svg = await satoriRender(element as unknown, {
        width,
        height: maxHeight,
        fonts,
    });

    // resvg converts SVG to PNG
    const resvgInstance = new ResvgClass(svg, {
        fitTo: {
            mode: `width`,
            value: width,
        },
    });
    const pngData = resvgInstance.render();
    return Buffer.from(pngData.asPng());
}
