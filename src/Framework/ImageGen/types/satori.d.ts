/**
 * Minimal type declarations for satori
 * Install the actual package: npm install satori
 */
declare module 'satori' {
    interface SatoriFont {
        name: string;
        data: ArrayBuffer;
        weight: number;
        style: string;
    }

    interface SatoriOptions {
        width: number;
        height: number;
        fonts: SatoriFont[];
    }

    /** Render a React-like element tree to SVG string */
    export default function satori(element: unknown, options: SatoriOptions): Promise<string>;
}
