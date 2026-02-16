/**
 * Minimal type declarations for @resvg/resvg-wasm
 * Install the actual package: npm install @resvg/resvg-wasm
 */
declare module '@resvg/resvg-wasm' {
    interface ResvgFitTo {
        mode: 'width' | 'height' | 'zoom' | 'original';
        value?: number;
    }

    interface ResvgOptions {
        fitTo?: ResvgFitTo;
    }

    interface ResvgRenderResult {
        /** Convert rendered image to PNG buffer */
        asPng(): Uint8Array;
    }

    /** SVG to PNG renderer powered by WebAssembly */
    export class Resvg {
        constructor(svg: string, options?: ResvgOptions);
        /** Render the SVG to a pixel buffer */
        render(): ResvgRenderResult;
    }

    /** Initialize the WASM module -- must be called once before any rendering */
    export function initWasm(wasmSource: Promise<Response> | ArrayBuffer): Promise<void>;
}
