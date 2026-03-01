import { RegisterObjectViewTheme } from './ObjectViewThemeRegistry.js';

/**
 * Side-effect module that registers all built-in object view themes
 * Import this at application boot to populate the theme registry
 *
 * @example
 * import './Framework/ObjectViewThemeDefaults.js';
 */

RegisterObjectViewTheme(`game`, {
    color: 0x3498DB,
    accentEmoji: `🎮`,
});

RegisterObjectViewTheme(`character`, {
    color: 0xE67E22,
    accentEmoji: `🧑`,
});

RegisterObjectViewTheme(`organization`, {
    color: 0x2ECC71,
    accentEmoji: `🏛️`,
});

RegisterObjectViewTheme(`building`, {
    color: 0x9B59B6,
    accentEmoji: `🏗️`,
});

RegisterObjectViewTheme(`task`, {
    color: 0xF1C40F,
    accentEmoji: `📋`,
});

RegisterObjectViewTheme(`template`, {
    color: 0x1ABC9C,
    accentEmoji: `📐`,
});

RegisterObjectViewTheme(`user`, {
    color: 0xE74C3C,
    accentEmoji: `👤`,
});
